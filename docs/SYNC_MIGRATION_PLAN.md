# Sync-Migrationsplan

## Sicherheitsprinzip

Keine destruktive Änderung an `mt_cloud_data`. Neue Tabellen/RPCs sind additiv;
jede Stufe besitzt Feature Flag, Telemetrie ohne Nutzinhalte und einen Rückweg.
Ein Nutzer wird erst nach lokaler Sicherung und erfolgreicher Revision-0-
Übernahme auf den neuen Worker umgestellt.

## SYNC-01B — Persistente lokale Speicherung und Outbox

| Aspekt | Plan |
|---|---|
| Betroffene Dateien | Neu: `js/sync-store.js`, `js/sync-worker.js`, Unit-/Integrationstests; angepasst: `js/store.js`, `js/sync.js`, `js/auth.js`, `index.html` (Status/Recovery-Hinweis) |
| Abhängigkeiten | Browser-IndexedDB, keine neue Library; bestehende `dataKey(userId)`-Daten und Auth-User |
| Umsetzung | Einmaliger, transaktionaler LocalStorage-Import je User; Projektion+Outbox vor UI-Bestätigung; stabile IDs ergänzen; serialisierter Worker, Online-Trigger/Backoff |
| Risiken | Fehlerhafte Altformate, IndexedDB-Quota, doppelte ID-Generierung |
| Tests | Migration leer/alt/defekt, Reload, Offline, Quota, Queue-Reihenfolge, User-Wechsel, kein Datenverlust vor Netzwerk |
| Akzeptanz | Jede bestätigte Mutation existiert nach Reload in IndexedDB und genau einmal in der Outbox; keine Netzwerkpflicht für UI-Erfolg |
| Rollback | Feature Flag zurück auf LocalStorage-Read; IndexedDB und Legacy-Snapshot bleiben unverändert/exportierbar |

### Implementierungsstand (13.10.2026)

Abgeschlossen und **standardmäßig deaktiviert** (`CONFIG.SYNC_V2_ENABLED = false`):

- `js/sync-store.js` erstellt pro bestätigtem Nutzer eine IndexedDB-Projektion,
  eine immutable, benutzergebundene Outbox-Operation und Metadaten gemeinsam in
  einer Transaktion. Jede Operation hat eine stabile UUID, eine lokale Revision
  und den Zustand `queued`.
- `SyncWorker` serialisiert lokale Imports und Commits, blockiert User-Wechsel
  ohne vorheriges `stop()` und kann nach einer fehlgeschlagenen Aufgabe weitere
  Aufgaben wieder annehmen. Logout stoppt den aktiven Worker.
- Fehlende IDs für Lebensmittel, Log-, Wasser-, Fasten- und Trainingsereignisse
  werden vor dem Enqueue ergänzt. Der unveränderte LocalStorage-Snapshot wird
  erst nach erfolgreichem IndexedDB-Commit gespiegelt; ein IndexedDB-Fehler
  meldet keinen lokalen Speichererfolg.
- Es gibt bewusst keinen Netzversand, keinen Online-Backoff und keine
  Cloud-Bestätigung: Das gehört zu SYNC-01C. Queued bedeutet ausschließlich
  lokal dauerhaft gespeichert, niemals serverseitig synchronisiert.

Die Implementierung benötigt zur Laufzeit nur die Browser-IndexedDB-API.
`fake-indexeddb` ist ausschließlich eine Development-Dependency für die
deterministische Integrationstestumgebung. Die Flag-Aktivierung bleibt bis
mindestens SYNC-01C gesperrt; ein browserlokaler Wert kann sie nicht aktivieren.

## SYNC-01C — Atomare Cloud-Versionierung und Konfliktschutz

| Aspekt | Plan |
|---|---|
| Betroffene Dateien | Neue versionierte SQL-Migration/RPC, `js/sync-worker.js`, Testmocks; vorhandene direkte `mt_cloud_data`-Writes erst nach Staging entfernen |
| Abhängigkeiten | Freigegebener Supabase-Staging-/Produktzugang, B abgeschlossen, RLS-Review |
| Umsetzung | Additive State-/Operations-Tabellen, RPC mit `auth.uid`, Zeilensperre, erwarteter Revision, `op_id`-Dedup und Größen-/Schema-Validierung |
| Risiken | SQL/RLS-Fehler, fehlerhafte Operationssemantik, Migration großer Snapshots |
| Tests | Staging-RPC für Fremduser, Retry derselben Batch, Revision-Mismatch, atomarer Fehlerfall, RLS-Negativtest |
| Akzeptanz | Kein Client kann State direkt schreiben; stale Batch ändert Serverdaten nicht; Retry erzeugt keine Duplikate |
| Rollback | RPC/Tabellen bleiben additiv, Flag schaltet Clients auf bisherigen Read-only-Snapshotpfad zurück; kein Drop/kein Datenrewrite |

## SYNC-01D — Konfliktauflösung und Recovery

| Aspekt | Plan |
|---|---|
| Betroffene Dateien | `js/sync-worker.js`, neue Konflikt-/Recovery-UI, Tests, Nutzerhilfe |
| Abhängigkeiten | B/C, definierte Entitäts- und Tombstone-Semantik |
| Umsetzung | Automatischer Rebase nur für sichere disjunkte/additive Operationen; persistierte Konflikte mit Vergleich, „lokal behalten“, „Cloud übernehmen“ oder Export; keine Default-Überschreibung |
| Risiken | UX-Überforderung, falsche Domänenregel, Konfliktstau |
| Tests | Same-entity Update, Delete-vs-Update, zwei Offline-Browser, Crash während Konflikt, manueller Export/Recovery |
| Akzeptanz | Kein Pending-Item verschwindet ohne Entscheidung; Entscheidungen sind selbst versionierte Operationen; Sync wird danach fortgesetzt |
| Rollback | Konflikt bleibt in IndexedDB, Flag deaktiviert automatische Rebase, Export bleibt verfügbar |

## SYNC-01E — Integrationstests, Multi-Device-E2E und Staging

| Aspekt | Plan |
|---|---|
| Betroffene Dateien | Vitest-/Playwright-Tests, Staging-Runbook, CI optional mit getrennten Secrets |
| Abhängigkeiten | Isoliertes Supabase-Staging, kurzlebige Testkonten, B–D |
| Umsetzung | Zwei Browser-Kontexte, Netzwerk-Interception, echte Staging-RPC/RLS-Negativtests; niemals Produktion in CI |
| Risiken | Flaky externe E2E, Testdaten-Residuen, Secret-Leak |
| Tests | Vollständige Matrix aus Offline, Retry, Reload, Auth-Ablauf, Logout, Userwechsel, Concurrent Edit und Migration |
| Akzeptanz | Reproduzierbare Staging-Suite, bereinigte Testkonten, alle P0/P1-Szenarien grün und beobachtbar |
| Rollback | Staging-Flag und Testdaten separat; Produktion unverändert bis expliziter Release-Gate |

## Reihenfolge und Release-Gates

`01B → 01C → 01D → 01E`. Nach jedem Paket: Migrationstest, Exportprobe,
Security/RLS-Review, vorhandene QA-Suite und explizite Freigabe. Erst wenn E
grün ist, erfolgt ein gradueller Feature-Flag-Rollout. `mt_cloud_data` wird erst
nach dokumentierter Export-/Retention-Freigabe aus dem aktiven Pfad entfernt.
