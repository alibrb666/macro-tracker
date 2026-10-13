# Repository-Cleanup-Audit

Stand: 13.10.2026 — Phase 0, nur Analyse. Es wurden keine bestehenden Dateien
verschoben, geändert oder gelöscht. Dieses Dokument ist die Entscheidungsgrundlage
für ein separates, freizugebendes Cleanup-Arbeitspaket.

## Methode und Grenzen

Untersucht wurden der gesamte Arbeitsbaum (einschließlich ignorierter lokaler und
generierter Dateien), alle 49 versionierten Dateien, HTML-Event-Handler, globale
JavaScript-Symbole, externe CDN- und SaaS-Aufrufe, Java-Quell- und Testcode,
Maven-Abhängigkeiten, SQL-Skripte, Docker-Konfiguration und Git-Historie. Für
statische Referenzen wurden `rg` und die Skript-/Stylesheet-Reihenfolge in
`index.html` verwendet.

Eine fehlende Repository-Referenz beweist **nicht**, dass ein extern
bereitgestellter Dienst ungenutzt ist. Daher werden das Spring-Backend, seine
Migration und seine Tests nicht automatisch zum Löschen freigegeben.

## Ist-Architektur und Bestand

| Bereich | Bestand | Nachgewiesener Zweck / Abhängigkeiten |
|---|---:|---|
| Browser-Frontend | `index.html`, 19 klassische JS-Dateien, 5 CSS-Dateien | Einzige Frontend-Auslieferung; alle lokalen Skripte und Stylesheets werden in fester Reihenfolge von `index.html` eingebunden. Inline-Handler rufen globale Funktionen auf. |
| Externe Browser-Abhängigkeiten | Supabase JS, Tesseract, html5-qrcode (CDN) | `sync.js`, `library.js`; Auth/Cloud-Sync, OCR, Barcode-Fallback. Open Food Facts wird in `library.js` per API aufgerufen. |
| Aktiver Datendienst | `supabase-direct-sync.sql`, `supabase-auth-hardening.sql` | Das Frontend verwendet `window.supabase` direkt und die Tabellen `mt_cloud_data` / `mt_profiles`; die Skripte legen RLS-Policies fest. |
| Legacy-Backend | `backend/` (9 Main-Java-, 2 Test-Java-Dateien, Maven, Docker) | Vollständiges Spring/JPA/JWT-Backend mit `/api/data`, PostgreSQL und `mt_user_data`; aus aktivem Frontend nicht referenziert. Kann separat extern betrieben worden sein. |
| Dokumentation | `AUTH_AUDIT.md`, `TESTERGEBNISSE.md`, `backend/README.md` | Auth- und Testhistorie; die Backend-README beschreibt teilweise bereits entfernte API- und Klassenpfade. |
| Konfiguration | Root-/Backend-`.gitignore`, `backend/.env.example`, Dockerfile | Ignoriert Build/Secrets/IDE; Beispielkonfiguration und Container-Build für das Legacy-Backend. Keine CI/CD-Dateien gefunden. |
| Lokale/generierte Artefakte | 10 `.DS_Store`, `backend/target/` (31 Dateien), `.claude/settings.local.json` | Ignoriert, nicht versioniert. `target/` sind Maven-Outputs; `.claude` sind lokale Tool-Berechtigungen. |

Die Frontend-Logik ist bewusst als globale, nicht modulare Skriptkette umgesetzt.
Das ist kein Löschgrund: Umstellung auf ES-Module wäre eine funktionale
Refaktorierung und gehört nicht in ein risikoarmes Cleanup.

## Klassifizierte Löschkandidaten, priorisiert

### A — Nachweislich unnötig, nach Freigabe sicher entfernbar

| Priorität | Pfad | Aktuelle Funktion / Referenzen | Begründung, Risiko, Tests | Vorgeschlagene Maßnahme |
|---:|---|---|---|---|
| A1 | `backend/target/` (31 lokale Dateien) | Maven-Klassen, JARs und Surefire-Berichte; durch `mvn` reproduzierbar, bereits ignoriert. | Kein Quell- oder Deploy-Input; niedriges Risiko. Danach `mvn test` und `mvn package` ausführen. | Lokalen Build-Ordner löschen, **nicht** versionieren. |
| A2 | `.DS_Store` an der Wurzel sowie 10 unter `backend/` | Finder-Metadaten, nicht versioniert; Root- und Backend-Ignore greifen. | Keine Programmreferenzen; vernachlässigbares Risiko. Sichtprüfung mit `git status --ignored`. | Lokale Dateien löschen. |

Diese Artefakte umfassen derzeit **42 Dateien** (11 Finder-Dateien plus 31
Maven-Outputs) in **einem generierten Verzeichnis**. Sie sind nicht Teil eines
Git-Diffs, weil sie bereits korrekt ignoriert werden.

### B — Wahrscheinlich unnötig, aber zusätzliche Prüfung erforderlich

| Priorität | Pfad | Aktuelle Funktion / Referenzen | Begründung, Risiko, Tests | Vorgeschlagene Maßnahme |
|---:|---|---|---|---|
| B1 | `.claude/settings.local.json` | Lokale, ignorierte Berechtigungspräferenzen; keine Laufzeitreferenz. | Wahrscheinlich rein lokal, aber kann den Arbeitsablauf einer Person beeinflussen. Niedrig für Produkt, mittel für lokale Tool-Nutzung. | Product Owner/Repo-Owner fragen; bei Zustimmung lokal entfernen und ggf. `.claude/` explizit im Root-Ignore dokumentieren. |
| B2 | `backend/src/main/java/com/macrotracker/config/GlobalExceptionHandler.java` | Spring `@RestControllerAdvice`; im aktuellen `DataController` sind keine Bean-Validation-Annotationen sichtbar. | Der `ResponseStatusException`-Pfad kann bei künftigen oder Framework-Fehlern relevant sein. Keine sichere Nutzlosigkeit. | Erst mit Controller-/Integrations-Test und externer Backend-Statusprüfung bewerten; ansonsten behalten. |
| B3 | `backend/src/main/resources/application.properties`: `spring-boot-starter-validation` und zugehöriger Validierungsteil im `pom.xml` | Keine im Main-Code nachgewiesenen Jakarta-Validation-Annotationen. | Transitive oder künftige Nutzung nicht ausgeschlossen; Entfernen verändert Backend-Build und Fehlerbehandlung. | `mvn dependency:analyze`, Compile/Tests und API-Smoke-Test nach einer isolierten Prüfung; nur dann Dependency entfernen. |
| B4 | Doppelte Funktionsdeklarationen in `js/logging.js`: `openLogModal`, `openEditEntry`, `saveEditEntry` (je zweimal) | In derselben klassischen Skriptdatei überschreibt die zweite Deklaration die erste. | Die ersten Implementierungen sind nachweislich zur Laufzeit nicht erreichbar; Entfernen ist semantisch wahrscheinlich sicher, aber UI-Flüsse/Inline-Handler müssen getestet werden. | Diff der Paare prüfen, erste Deklarationen in eigenem Commit entfernen, Loggen/Bearbeiten/Löschen und Drag&Drop manuell/E2E testen. |
| B5 | `backend/README.md` | Beschreibt alte Klassen (`user/`, `auth/`, `JwtService`) und Endpunkte (`/api/auth/*`), die nicht mehr im Baum liegen. | Dokumentation ist irreführend; sie kann jedoch noch als historische Deploy-Anleitung dienen. | Nach der Backend-Entscheidung durch aktuelle README ersetzen oder zusammen mit dem Backend entfernen. |

### C — Legacy, aber noch referenziert oder betriebsrelevant: vorerst behalten

| Priorität | Pfad | Aktuelle Funktion / Referenzen | Löschbegründung / Risiko | Erforderliche Tests und Entscheidung |
|---:|---|---|---|---|
| C1 | `backend/` vollständig, außer den separat genannten B-/A-Kandidaten | Eigenständiges Spring-Boot-Daten-API, Docker-Deployment, PostgreSQL-Tabelle `mt_user_data`, JWT-Validierung und Tests. Kein Aufruf durch `js/` oder `index.html`; `supabase-direct-sync.sql` nennt es ausdrücklich als abgelöst. | Starker Legacy-Kandidat, aber Löschen kann einen extern laufenden Service, dessen Daten oder eine Fallback-/Rollback-Möglichkeit treffen. Hoher Betriebs- und Datenrisiko. | Product Owner muss bestätigen: kein laufendes Deployment, keine aktiven Backend-Clients, Export/Retention der `mt_user_data` gesichert. Danach Supabase-Staging-E2E des direkten Sync und Release-/Rollback-Plan. |
| C2 | `backend/db-migration.sql` | Dokumentiert alte Tabellen und enthält nur auskommentierte Drops. | Obsolet für den direkten Sync, aber historischer Hinweis auf migrationsrelevante Tabellen. Keine aktive Migration löschen. | Erst nach C1 und Dateninventar archivieren oder entfernen; keine produktiven Tabellen ohne explizite Freigabe anfassen. |
| C3 | `TESTERGEBNISSE.md` | Historischer Backend-Testbericht; erwähnt inzwischen nicht mehr aktuelle Annahmen über `sync.js`/`/api/data`. | Veraltet, kann aber Audit-Evidenz darstellen. | Nach C1 entweder aktualisieren und als Archiv kennzeichnen oder mit Legacy-Backend entfernen; E2E-Status separat dokumentieren. |
| C4 | Hinweise auf `mt_app_data`, `mt_email_tokens`, `mt_user_data`, `mt_users` in SQL/Dokumentation | Historische Supabase-/Backend-Tabellen, außerhalb dieses Repositories. | Daten- und Sicherheitsrelevant. Nicht automatisch entfernen, nicht aus Git-Historie bereinigen. | Tabellenbesitz, Datenexport, RLS und tatsächliche Clients im Supabase-Dashboard prüfen; explizite PO-Freigabe erforderlich. |

### D — Kritisch oder unverzichtbar: behalten

| Pfad/Gruppe | Nachgewiesener Zweck |
|---|---|
| `index.html`, `css/*.css`, `js/*.js` | Aktive Single-Page-App. Alle lokalen Dateien sind über HTML geladen oder über globale Funktionen/DOM-IDs miteinander gekoppelt. |
| `supabase-direct-sync.sql` | Stellt die vom aktiven Frontend genutzte Tabelle und RLS-Policies bereit. Fehlende statische Dateireferenz ist bei manueller Supabase-Ausführung erwartbar. |
| `supabase-auth-hardening.sql` | Ergänzt Profile und schützt `mt_profiles`/`mt_cloud_data`; sicherheitsrelevant und additiv. |
| `AUTH_AUDIT.md` | Enthält die aktuelle Zielarchitektur und die Vorbedingungen für Auth-/Deployment-Prüfungen. |
| Root-/Backend-`.gitignore`, `backend/.env.example`, `backend/Dockerfile`, `backend/pom.xml` | Für lokale Hygiene bzw. (bis C1 entschieden ist) reproduzierbaren Backend-Build/Deployment erforderlich. |
| Java-Tests unter `backend/src/test/` | Testabdeckung, nicht bloß Repository-Größe. Vor C1 nicht löschen. |

## Abhängigkeits-, Duplikat- und Sicherheitsbefunde

- Es gibt kein `package.json`, Lockfile oder Frontend-Bundler. Die drei
  Browser-Bibliotheken sind bewusst CDN-Abhängigkeiten; alle haben konkrete
  Aufrufstellen. Ein Entfernen wäre funktionsschädlich.
- Maven-Abhängigkeiten sind für den vorhandenen Legacy-Backend-Code passend.
  Einzig `spring-boot-starter-validation` ist Kandidat B3; keine Dependency wird
  in Phase 0 geändert.
- Statisch nachgewiesene doppelte Geschäftslogik existiert nur bei den drei
  überschriebenen Funktionen in `js/logging.js` (B4). Gleichnamige CSS- oder
  DOM-Referenzen sind wegen dynamischem HTML und Inline-Handlern nicht ohne
  Browseranalyse sicher als unbenutzt klassifizierbar.
- Kein versioniertes privates Schlüsselmaterial gefunden. Die im Frontend
  vorhandene Supabase-Anon-Key ist ein öffentlicher Client-Schlüssel und nur mit
  korrekten RLS-Policies sicher; die SQL-Skripte sind daher kritisch. Das
  Backend bezieht sein Secret ausschließlich aus Umgebungsvariablen. Eine
  tatsächliche Secret-Scan-/Hosting-Prüfung ist ohne Zugriff auf Git-Historie
  und Provider nicht abschließend möglich.
- Keine CI/CD-Manifestdatei und keine Browser-E2E-Suite vorhanden. Damit sind
  diese Prüfungen aktuell manuell bzw. in Staging nachzuholen.

## Validierte Baseline

Ausgeführt am 13.10.2026, ohne Zugriff auf Produktionsdienste:

| Prüfung | Ergebnis |
|---|---|
| `node --check js/*.js` | bestanden (19 Dateien) |
| `backend/mvn -q test` | bestanden (lokale Maven-Tests) |
| Statische Referenzprüfung der Skripte/Stylesheets | vollständig aus `index.html` eingebunden |
| Deployment-Konfigurationsinventar | nur `backend/Dockerfile`; keine CI/CD- oder Frontend-Hostingdatei gefunden |

Nicht durchgeführt: Produktion, Datenbankmigrationen, Authentifizierung gegen
Supabase oder Browser-E2E. Das ist absichtlich, um keine Konten, Daten oder
Produktivsysteme zu verändern.

## Zielstruktur nach genehmigtem Cleanup

Die Zielstruktur hängt an der C1-Entscheidung:

1. **Wenn das Backend abgeschaltet bestätigt ist:**
   ```text
   /
   ├── index.html
   ├── css/                 # aktive Präsentation
   ├── js/                  # aktive Browser-Anwendung
   ├── docs/                # aktuelle Architektur, Audit, Backlog
   ├── supabase-direct-sync.sql
   ├── supabase-auth-hardening.sql
   ├── AUTH_AUDIT.md        # nach Aktualitätsprüfung ggf. nach docs/
   └── .gitignore
   ```
   Die SQL-Dateien bleiben getrennt, weil sie zwei aufeinander bezogene,
   manuell auszuführende Datenbankschritte mit Sicherheitswirkung sind.
2. **Wenn das Backend weiter betrieben wird:** `backend/` bleibt ein klar
   abgegrenztes deploybares Subprojekt. Seine README, Konfiguration und Tests
   werden auf die tatsächliche Supabase-JWT-Architektur korrigiert; eine
   Zusammenlegung mit dem statischen Frontend erfolgt nicht.

Keine neuen Frameworks, leeren Verzeichnisse oder Abstraktionsschichten sind
vorgeschlagen.
