# Qualitätsbaseline (QA-01)

Stand: 13.10.2026.

## Implementierte Abdeckung

- 11 Vitest-Tests: Berechnung, ungültige Nährwerte, Serialisierung,
  Datumsgrenzen sowie Supabase-Sync mit lokaler Mock-Implementierung.
- 4 Playwright-Szenarien in Chromium und mobilem Chromium (8 Ausführungen):
  Offline-Start/Navigation, Lebensmittel und Ernährungseintrag anlegen,
  bearbeiten und löschen, Dialog und responsive Shell.
- Bestehende Maven-/JUnit-Tests bleiben Teil der Prüfung.

## Lokale Validierung

Am 13.10.2026 bestanden: JavaScript-Syntax, 11 Vitest-Tests, 8 Playwright-
Ausführungen (vier Szenarien in Desktop- und mobilem Chromium), die bestehenden
Maven-Tests sowie `git diff --check`. `npm audit` meldet nach dem Upgrade auf
Vitest 5.0.4 **0 Vulnerabilities**; auch `npm audit --omit=dev` meldet 0.
GitHub Actions wurde nicht ausgelöst und ist deshalb noch nicht extern bestätigt.

Die Browser-Smokes intercepten Supabase-, OCR- und Barcode-CDNs. Dadurch sind
sie deterministisch und berühren keine externen Daten. Eine Aussage über
Produktions-Supabase, Hosting oder GitHub Actions ist daraus nicht ableitbar.

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

## Nächste Qualitätsschritte

Ein isoliertes Supabase-Staging-Projekt mit kurzlebigen Testkonten einrichten,
RLS-Negativtests und Auth-E2E ergänzen sowie Snapshot-Konflikte fachlich
auflösen. Erst danach Browser- und Staging-Abnahme als Release-Gate werten.
