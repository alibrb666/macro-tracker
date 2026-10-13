# Backend- und Infrastrukturentscheidung (CLN-02)

Stand: 13.10.2026. Dies ist eine reine Leseanalyse: Kein Deployment, keine
Supabase-Tabelle, kein Secret und kein Anwendungscode wurde verändert.

## Kurzentscheidung

**Empfehlung: Architektur A, Supabase-only.** Das aktuell ausgelieferte und im
Repository vorhandene Frontend ist bereits vollständig unabhängig vom
Spring-Boot-Backend. Das Backend ist ein Legacy-Kandidat. Seine endgültige
Entfernung ist jedoch erst sicher, wenn der Product Owner die unten aufgeführten
externen Betriebs- und Datenbestätigungen erteilt hat.

## Nachgewiesene Ist-Architektur

```text
Browser (GitHub Pages) ── Supabase JS ──> Supabase Auth
        │                     │
        │                     └──────────> public.mt_profiles
        │                                  public.mt_cloud_data (RLS)
        └── Open Food Facts API (Barcode-Abfrage)

Legacy, derzeit ohne Frontend-Referenz:
Spring Boot/Docker ──> PostgreSQL/Supabase: mt_user_data
                     └─> GET/PUT /api/data (Supabase-JWT)
```

### Aktives Frontend

- `index.html` bindet Supabase JS sowie `js/sync.js` ein.
- `js/sync.js` verwendet `sb.auth` und `sb.from('mt_cloud_data')` für Upsert
  und Select. Es gibt im aktuellen Frontend keine `API_BASE`-, `fetch`-,
  `sendBeacon`- oder `/api/data`-Referenz zum Spring-Backend.
- `js/auth.js` nutzt Supabase Auth für E-Mail/Passwort, OAuth und
  Passwort-Reset und speichert ein öffentliches Profil in `mt_profiles`.
- Die aktive öffentliche Seite `https://alibrb666.github.io/macro-tracker/`
  antwortete am 13.10.2026 mit HTTP 200. Die öffentlich ausgelieferte
  `js/sync.js` enthält ebenfalls `CLOUD_DATA_TABLE = 'mt_cloud_data'` und die
  direkten Supabase-Operationen. Der aktive Release entspricht damit in diesem
  Punkt der Repository-Architektur.

### Legacy-Backend

- `backend/` enthält ein getrennt baubares Spring-Boot-Programm mit Dockerfile.
  Seine einzigen geschäftlichen Endpunkte sind `GET`/`PUT /api/data`; zusätzlich
  existieren `/` und `/health`.
- Es validiert Supabase-JWTs, verwendet JPA/PostgreSQL und speichert einen
  JSON-Snapshot je Benutzer in `mt_user_data`.
- Für Betrieb braucht es mindestens `SPRING_DATASOURCE_URL`,
  `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD`,
  `SUPABASE_JWT_SECRET` und optional `APP_CORS_ALLOWED_ORIGINS`. Solche Werte
  liegen nicht im Repository vor.
- Es gibt keine GitHub-Actions-, Compose-, Render-, Railway-, Vercel-, Netlify-
  oder sonstige Deploy-Konfiguration. Der Dockerfile ist der einzige
  Repository-Deploymenthinweis.
- Die Historie dokumentiert die Ablösung explizit: Commit `ea36bdd` („Replace
  backend sync with direct Supabase storage“) entfernte `API_BASE`
  (`https://macro-tracker-production-2915.up.railway.app`) und `/api/data` aus
  dem Frontend und fügte `supabase-direct-sync.sql` hinzu.

## Externe Betriebsprüfung und Grenzen

| Prüfung | Ergebnis | Aussagekraft |
|---|---|---|
| Git-Remote | `github.com/alibrb666/macro-tracker`; keine Infrastruktur-Remote oder CI-Konfiguration | Kein deklarativer Betrieb außerhalb von GitHub Pages nachweisbar. |
| Öffentliche GitHub-Pages-Auslieferung | HTTP 200; ausgeliefertes `sync.js` nutzt direkten Supabase-Sync | Belegt aktive Supabase-only-Frontend-Nutzung. |
| Historische Railway-URL `macro-tracker-production-2915.up.railway.app/health` | HTTP 404 | Kein erreichbarer Health-Endpunkt dort; beweist nicht, dass kein anders benannter Dienst/Projekt existiert. |
| README-Beispiel `macro-tracker-backend.onrender.com/health` | HTTP 404 | Kein erreichbarer Health-Endpunkt; die URL ist in der README als Beispiel formuliert, daher kein belastbarer Betriebsnachweis. |
| Docker-Container/Hosting-Accounts | Keine autorisierte Container-, Railway-, Render-, GitHub-Org- oder Cloud-Konto-Integration verfügbar | Laufende private Deployments können nicht ausgeschlossen werden. |
| Supabase-Katalog/Daten | Keine Service-Role-, Datenbank- oder Dashboard-Lesezugriffe verfügbar | Tabellenexistenz, Zeilenzahlen, Datenalter, RLS-Iststand und weitere Clients sind nicht verifizierbar. |

Die öffentlichen HTTP-Prüfungen waren ausschließlich lesend und verwendeten
weder Authentifizierung noch Datenbankzugriff. Sie dürfen nicht als Freigabe
interpretiert werden, Ressourcen oder Daten zu löschen.

## Datenbankinventar: Repository-Nachweis versus unbekannter Iststand

| Objekt | Quelle | Zweck | Tatsächlich vorhandene Daten verifiziert? |
|---|---|---|---|
| `auth.users` | Supabase-Referenz in beiden SQL-Skripten | Identität; FK-Ziel | Nein |
| `public.mt_cloud_data` | `supabase-direct-sync.sql` | Aktiver JSON-Cloud-Snapshot; `user_id`-PK, RLS und selektive Grants | Nein |
| `public.mt_profiles` | `supabase-auth-hardening.sql` | Anzeigename/Avatar, RLS und selektive Grants | Nein |
| `mt_user_data` | JPA-Entity / Legacy-Backend | Legacy-Snapshot je Supabase-User | Nein |
| `mt_app_data`, `mt_email_tokens`, `mt_users` | Nur auskommentierte Legacy-Drops und Audit-Hinweise | Mögliche Vorläufer der Eigen-Auth | Nein; Namen und Relevanz müssen im Dashboard bestätigt werden |

Die beiden Supabase-Skripte sind keine vollständige Migrationshistorie, sondern
manuell auszuführende, idempotent angelegte Schema-/Policy-Skripte. Sie zeigen
die Sollstruktur, aber nicht, ob oder wann sie auf dem Zielprojekt ausgeführt
wurden. Keine der genannten Tabellen wurde abgefragt oder verändert.

## Architekturvergleich

| Kriterium | A: Supabase-only | B: Supabase + Spring-Backend |
|---|---|---|
| Sicherheit | Kleinerer Angriffsraum; Auth und RLS sind zentral. Qualität hängt kritisch von RLS, Redirect-URLs und Provider-Einstellungen ab. | Zusätzlicher HTTP-, CORS-, JWT-Secret-, Datenbank- und Container-Angriffsraum; der Legacy-Service dupliziert Datenspeicherung. |
| Wartbarkeit | Eine Auth-/Datenpfad-Implementierung und keine Java-/Container-Pflege. | Zwei Datenpfade und Tabellenmodelle; Docs sind bereits teilweise veraltet. |
| Betriebskosten | Statisches Hosting plus Supabase; kein eigener Always-on-Service. | Zusätzlich Hosting, Build, Monitoring, Secret-Rotation und Datenbankzugang. |
| Performance/Skalierung | Direkter regionaler BaaS-Zugriff, ein Hop weniger. Snapshot-Upserts bleiben größen- und konfliktanfällig. | Zusätzlicher Hop und eigener Skalierungsbetrieb; nur sinnvoll bei serverseitiger Geschäftslogik, die hier nicht nachgewiesen ist. |
| Datenintegrität | RLS isoliert Konten; derzeit letzter Schreibvorgang gewinnt und der komplette Snapshot wird überschrieben. | Dieselbe Snapshot-Semantik in `mt_user_data`; keine nachgewiesene zusätzliche Konfliktlösung oder Validierung. |
| Entwicklungsaufwand | Niedrig für den bestehenden Funktionsumfang; E2E- und RLS-Prüfungen müssen ergänzt werden. | Höher: Java 17, Maven, Docker, Postgres, JWT-Secret, CORS und Tests dauerhaft betreiben. |
| Migrationsrisiko | Beherrschbar, wenn Legacy-Daten/Clients vor Abschaltung inventarisiert und gesichert werden. | Kurzfristig niedrig, aber dauerhafte Komplexitäts- und Divergenzrisiken. |

### Sicherheitsbewertung

Die vorhandenen RLS-Policies beschränken `mt_cloud_data` und `mt_profiles` auf
`auth.uid()`. Das passt zum aktiven Client-Modell. Der im Browser enthaltene
Supabase-Anon-Key ist kein Server-Secret; Schutz entsteht durch RLS. Vor einer
Entfernung des Backends muss im Zielprojekt dennoch bestätigt werden, dass RLS
aktiv ist, es keine zu breiten Policies/Service-Role-Lecks gibt und die
Produktions-Redirect-URLs sowie OAuth-Provider korrekt konfiguriert sind.

## Empfehlung und Voraussetzungen für Backend-Entfernung

Das Spring-Backend ist für das **nachweislich aktive Frontend nicht notwendig**.
Es sollte nach einer kontrollierten Außerbetriebnahme aus dem Repository
entfernt werden. Die Löschung bleibt blockiert, bis alle folgenden Punkte mit
Evidenz bestätigt sind:

1. In Railway, Render, Docker-/Cloud-Konten und DNS/Monitoring gibt es keinen
   laufenden Clientverkehr oder keinen zu erhaltenden Legacy-Service.
2. Supabase-Dashboard/SQL-Leseinventar bestätigt Existenz, Zeilenzahl,
   Datenalter und Eigentümer von `mt_user_data` sowie allen möglichen
   Legacy-Tabellen; relevante Daten sind exportiert und die Aufbewahrungsfrist
   ist freigegeben.
3. Keine ältere Web-, Mobile-, Integrations- oder Partner-Client-Version ruft
   `/api/data` auf. CDN-/Browser-Caches und alte Releases erhalten einen
   kommunizierten Abschalttermin.
4. Staging und Produktion haben den direkten Sync erfolgreich geprüft:
   Registrierung, E-Mail-Bestätigung, Passwort-Reset, Google-OAuth, Sync,
   Reload, Logout, Kontoisolation, Fehlerfall und lokale Datenübernahme.
5. RLS, Grants, Auth-Redirects und OAuth-Konfiguration wurden durch einen
   autorisierten Supabase-Admin geprüft; ein Backup/Restore-Test für relevante
   Cloud-Daten ist dokumentiert.
6. Ein Owner genehmigt Abschaltzeitpunkt, Datenaufbewahrung und Rollback-Fenster.

## Migrations- und Rollback-Plan (nach Freigabe, nicht ausgeführt)

1. **Inventarisieren:** Read-only SQL-/Dashboard-Export der Legacy-Tabellen,
   User-/Clientzugriffe und Datenalter; Prüfsumme/Archiv mit Zugriffsregeln
   dokumentieren.
2. **Staging validieren:** Einen repräsentativen, anonymisierten Datensatz in
   den direkten Sync überführen; vollständige Auth-/Sync-E2E und RLS-
   Negativtests ausführen.
3. **Vorankündigen:** Legacy-Clients identifizieren, Abschaltfenster und
   Supportpfad kommunizieren. Den Service zunächst nur beobachten, nicht sofort
   löschen.
4. **Cutover:** Aktuelle statische App als einzigen unterstützten Client
   ausrollen; Backend nach dem festgelegten Beobachtungsfenster stoppen, aber
   Image, Konfiguration (sicher verwahrt) und exportierte Daten bis zum Ende des
   Rollback-Fensters erhalten.
5. **Rollback:** Bei einem Vorfall Service mit derselben geprüften Konfiguration
   wieder bereitstellen und DNS/Client-Routing ausschließlich nach explizitem
   Incident-Entscheid zurückstellen. Direkt-Supabase-Daten nicht blind in
   `mt_user_data` zurückschreiben; Konflikte erst per Export vergleichen.
6. **Repository-Cleanup:** Erst nach Ablauf des Rollback-Fensters und Owner-
   Freigabe CLN-03A durchführen. Datenbanktabellen werden in einem separaten,
   ausdrücklich genehmigten Datenmigrationsvorgang behandelt.

## Product-Owner-Entscheidungen offen

1. Ist der Spring-Service in irgendeinem Cloud-, Docker- oder Kundenbetrieb
   aktiv, und wer ist dafür verantwortlich?
2. Welche Aufbewahrungs- und Löschfristen gelten für `mt_user_data` und die
   möglichen Vorgängertabellen?
3. Gibt es unterstützte Legacy-Clients oder ein verbindliches Rollback-SLA?
4. Wer kann die Supabase-Produktionskonfiguration, RLS und Datenexports
   autorisiert bestätigen?
5. Welches Staging-Projekt und welcher Abnahmeprozess gelten für die genannten
   E2E- und Sicherheitsprüfungen?
