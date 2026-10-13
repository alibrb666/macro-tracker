# Qualitätsbaseline (QA-01)

Stand: 13.10.2026.

## Implementierte Abdeckung

- 22 Vitest-Tests: Berechnung, ungültige Nährwerte, Serialisierung,
  Datumsgrenzen, Supabase-Sync mit lokaler Mock-Implementierung sowie die
  standardmäßig deaktivierte IndexedDB-Projektion/Outbox mit User-Isolation,
  seriellen Commits und realem IndexedDB-Ausfall.
- 7 Playwright-Szenarien in Chromium und mobilem Chromium (14 Ausführungen):
  Offline-Start/Navigation, Lebensmittel und Ernährungseintrag anlegen,
  bearbeiten und löschen, Dialog und responsive Shell sowie V2-IndexedDB-
  Bootstrap/Reload, verzögerter Save beim Benutzerwechsel und Legacy-Gating.
- Bestehende Maven-/JUnit-Tests bleiben Teil der Prüfung.

## Lokale Validierung

Am 13.10.2026 bestanden: JavaScript-Syntax, 22 Vitest-Tests, 14 Playwright-
Ausführungen (vier Szenarien in Desktop- und mobilem Chromium), die bestehenden
Maven-Tests sowie `git diff --check`. `npm audit` meldet nach dem Upgrade auf
Vitest 5.0.4 **0 Vulnerabilities**; auch `npm audit --omit=dev` meldet 0.
GitHub Actions wurde für den QA-Pull-Request erfolgreich ausgeführt: die Jobs
`Quality / frontend` und `Quality / legacy-backend` waren erfolgreich.

Die Browser-Smokes intercepten Supabase-, OCR- und Barcode-CDNs. Dadurch sind
sie deterministisch und berühren keine externen Daten. Eine Aussage über
Produktions-Supabase oder Hosting ist daraus nicht ableitbar.

## Bekannte Qualitätsrisiken

1. Direkter Cloud-Sync speichert ganze Snapshots; parallele Geräte können sich
   weiterhin gegenseitig überschreiben.
2. Der Schluss-Sync im Browser ist nicht garantiert, weil asynchrone Arbeit in
   `beforeunload` vom Browser abgebrochen werden kann.
3. Auth/OAuth, RLS, OCR, Kamera und Open Food Facts benötigen Staging- oder
   Geräteabnahme. Sie werden absichtlich nicht mit Produktivkonten getestet.
4. Es gibt keine Coverage-Grenze: Klassische globale Skripte lassen sich ohne
   Refaktorierung nicht sinnvoll dateiweise instrumentieren. Testanzahl und
   kritische Flüsse sind die aktuelle messbare Basis.
5. Die lokale SYNC-01B-Outbox besitzt absichtlich noch keinen Cloud-Versand,
   Retry-Backoff oder Serverbestätigung. Das Flag bleibt daher deaktiviert;
   eine Aktivierung vor SYNC-01C wäre nicht freigabefähig.

## Nächste Qualitätsschritte

Ein isoliertes Supabase-Staging-Projekt mit kurzlebigen Testkonten einrichten,
RLS-Negativtests und Auth-E2E ergänzen sowie Snapshot-Konflikte fachlich
auflösen. Erst danach Browser- und Staging-Abnahme als Release-Gate werten.
