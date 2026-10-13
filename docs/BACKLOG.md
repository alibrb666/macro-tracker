# Cleanup-Backlog

Status: CLN-01 und die Analyse CLN-02 am 13.10.2026 abgeschlossen. Eine
Produkt-Owner-Entscheidung zu C1 und die externen Bestätigungen bleiben
Voraussetzung für CLN-03/CLN-04.

## QA-01 — Test- und CI-Fundament (abgeschlossen, 13.10.2026)

- Vitest/jsdom deckt deterministische Fachlogik, LocalStorage und den direkten
  Supabase-Sync mit Mocks ab; Playwright deckt isolierte Desktop-/Mobil-Smokes
  ab. Befehle und Grenzen: `docs/TEST_STRATEGY.md`.
- `.github/workflows/quality.yml` prüft auf Pull Requests und `main` ohne
  Deploy-Rechte: Lockfile-Installation, JS-Syntax, Vitest, Playwright,
  Diff-Prüfung und den Java-17-Maven-Testjob.
- Qualitätsstatus, Testzahlen und Restrisiken: `docs/QUALITY_BASELINE.md`.
- Die anfänglich von `npm audit` gemeldeten kritischen transitive Vitest-3/
  Tinypool-Befunde wurden durch Vitest 5.0.4 behoben; der anschließende Audit
  meldet 0 Vulnerabilities.
- Kein GitHub-Actions-Lauf wurde in diesem Auftrag ausgelöst; der CI-Status ist
  daher **konfiguriert, aber extern noch nicht bestätigt**.

## CLN-01 — Risikoarme lokale Hygiene

Voraussetzung: Freigabe für Kategorie A.

1. `backend/target/` und die 11 lokalen `.DS_Store` entfernen.
2. Sicherstellen, dass sie weiterhin ignoriert sind; Root-`.gitignore` nur bei
   nachvollziehbarem Mehrwert ergänzen.
3. Prüfen: `git status --ignored`, `node --check js/*.js`, `cd backend && mvn test`.
4. Ergebnis im Abschlussbericht zählen (derzeit erwartet: 42 Dateien in einem
   generierten Verzeichnis; keine versionierten Dateien).

### Ergebnis CLN-01 (13.10.2026)

- Erfüllt: `backend/target/` mit 31 generierten Dateien und die 11 Finder-
  Metadatendateien außerhalb davon wurden lokal entfernt. Das entspricht 42
  entfernten Dateien und einem entfernten Verzeichnis; keine versionierte Datei
  war betroffen.
- Erfüllt: Der Testlauf erzeugte `backend/target/` anschließend erwartungsgemäß
  mit 22 neuen Build-/Testdateien. Es bleibt durch `backend/.gitignore` (`target/`)
  vollständig ignoriert und wird nicht zur Versionierung vorgemerkt.
- Erfüllt: `.DS_Store` ist durch Root-`.gitignore` sowie
  `backend/.gitignore` abgedeckt. Es wurden keine neuen Finder-Dateien erzeugt.
  Eine Änderung der Ignore-Dateien war nicht notwendig.
- Bestanden: `node --check js/*.js` (19 Dateien), `cd backend && mvn -q test`
  sowie `git diff --check`.
- Git-Status nach Prüfung: ausschließlich die neuen, noch unversionierten
  Audit-/Backlog-Dokumente unter `docs/` sowie die weiterhin ignorierten lokalen
  Verzeichnisse `.claude/` und `backend/target/`; keine Änderungen an
  Anwendungscode, SQL, Backend-Quellen oder bestehenden Konfigurationen.

## CLN-02 — Externe Backend-Entscheidung (Blocker)

Voraussetzung: Product-Owner-Entscheidung und Nachweis außerhalb des Repos.

1. Bestätigen, ob ein Spring-Backend/Docker-Container produktiv oder als
   Fallback läuft und ob andere Clients `/api/data` ansprechen.
2. Vor einer Abschaltung `mt_user_data` und ggf. weitere Legacy-Tabellen
   inventarisieren/exportieren; keine Daten oder Migrationen ohne explizite
   Freigabe löschen.
3. Direkten Supabase-Sync in einer Staging-Umgebung testen: Registrierung,
   E-Mail-Login, OAuth, Passwort-Reset, Cloud-Sync, Reload, Logout,
   Kontoisolation und Barcode/OCR-Fallback.
4. Entscheidung dokumentieren: **Backend behalten** oder **Backend
   dekommissionieren**. Bei Dekommisionierung einen Rollback-Zeitraum festlegen.

### Ergebnis CLN-02 (13.10.2026)

- Der Entscheidungsbericht steht in `docs/BACKEND_DECISION.md`.
- Nachweis: Das aktuelle Repository und die öffentlich ausgelieferte GitHub-
  Pages-App verwenden Supabase Auth sowie `mt_profiles`/`mt_cloud_data` direkt;
  keine aktive Frontend-Referenz ruft das Spring-Backend oder `/api/data` auf.
- Nachweis: Die Historie (`ea36bdd`) ersetzte den Railway-Backend-Sync durch
  den direkten Supabase-Sync. Die historische Railway-URL und eine Render-
  Beispieladresse antworteten öffentlich jeweils mit HTTP 404.
- Empfehlung: Supabase-only nach kontrollierter Außerbetriebnahme des
  Backends. Das Backend bleibt bis zur Freigabe erhalten.
- Blocker: Ohne autorisierten Zugriff auf Hosting-/Container-Konten,
  Supabase-Dashboard und Datenbank kann weder ein anderer laufender Dienst noch
  Bestand, Relevanz oder Export der Legacy-Tabellen abschließend bestätigt
  werden. Product Owner muss die in `BACKEND_DECISION.md` aufgeführten
  Betriebs-, Datenaufbewahrungs- und Rollback-Entscheidungen treffen.

## CLN-03A — Falls Backend dekommissioniert wird

Voraussetzung: CLN-02 mit bestätigter Abschaltung, Datenexport und Rollback-Plan.

1. In einem eigenen Git-Commit `backend/`, dessen Docker/Maven-Konfiguration,
   Tests und `backend/db-migration.sql` entfernen.
2. `backend/README.md` und veraltete Backend-Aussagen in `TESTERGEBNISSE.md`
   entfernen oder eindeutig archivieren; aktive Dokumentation unter `docs/`
   konsolidieren.
3. Kategorie-B4-Duplikate in `js/logging.js` in einem separaten Commit
   entfernen, nur nach Verhaltensvergleich.
4. Validieren: JS-Syntax, statische Link-/Import-Prüfung, lokaler Browser-Smoke
   aller Tabs, Staging-E2E des direkten Supabase-Flows, Deployment auf dem
   vorgesehenen statischen Hosting und erneuter Secret-Scan.

## CLN-03B — Falls Backend erhalten bleibt

Voraussetzung: CLN-02 mit bestätigter betrieblicher Nutzung.

1. `backend/README.md` auf die tatsächlich vorhandenen Klassen, Supabase-JWT,
   Endpunkte, Umgebungsvariablen und Tabellen aktualisieren.
2. B2/B3 mit `mvn dependency:analyze`, Tests und API-Smoke-Test bewerten;
   ungenutzte Dependency nur mit reproduzierbarem Build entfernen.
3. Backend-E2E/Container-Smoke und CI für Java 17 ergänzen; kein Entfernen von
   Java-Tests zur Größenreduktion.
4. Frontend und Backend als getrennte Deploy-Ziele dokumentieren, ohne sie
   künstlich in ein neues Framework zu überführen.

## CLN-04 — Abschluss und Sicherheitskontrolle

Nach jedem genehmigten Paket: `git diff --check`, `git status`, Syntax-/Build-/Test-
Protokoll, unerledigte Risiken aktualisieren. Abschließend vollständigen Baum
erneut inventarisieren, alle Kandidaten neu klassifizieren und berichten:
entfernte Dateien/Verzeichnisse/Dependencies/Duplikate, Strukturänderungen,
Testergebnisse, technische Schulden und Restrisiken.

### Freigabeentscheidung benötigt

Soll das Spring-Backend einschließlich seiner historischen Supabase-Daten nach
bestätigtem Export dekommissioniert werden, oder bleibt es ein unterstützter
Produktionsbestandteil? Ohne diese Entscheidung ist ausschließlich CLN-01
risikoarm ausführbar.
