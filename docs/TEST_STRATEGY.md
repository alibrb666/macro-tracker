# Teststrategie

## Ziele und lokale Befehle

Die Anwendung bleibt Vanilla JavaScript; die Testschicht führt kein UI-Framework
ein. Installation und vollständige lokale Prüfung:

```bash
npm ci
npx playwright install chromium
npm run check
```

Einzelne Stufen: `npm run check:js`, `npm run test:unit`, `npm run test:e2e`
und `npm run test:backend`. Playwright startet ausschließlich den lokalen,
statischen Testserver `tests/e2e/server.mjs`; CDN-Skripte werden gemockt und
Open Food Facts wird blockiert. Es werden keine echten Supabase-Konten,
Tokens oder Daten verwendet.

## Testpyramide

| Ebene | Werkzeug | Abdeckung |
|---|---|---|
| Unit | Vitest + jsdom/vm | BMR/TDEE/Makro-Floors, Nährwertvalidierung, Datumsschlüssel, LocalStorage-Serialisierung und Fehlertoleranz |
| Integration | Vitest + Supabase-Doppelgänger | Snapshot-Upsert, Session-Ablauf, Speicherfehler und wiederholtes Pulling |
| Browser-Smoke | Playwright/Chromium, Desktop und mobil | App-Start im Offline-Modus, Navigation, Dialoge, Lebensmittel-/Eintrags-CRUD, Kalorienanzeige, mobile Shell |
| Legacy-Backend | Maven/JUnit | JWT-Validierung und isolierter Datenfluss bleiben ausgeführt, solange das Backend existiert |

## Bewusste Grenzen

Echte Registrierung, E-Mail, Google OAuth, RLS-Istkonfiguration, OCR,
Kamerazugriff, Barcodeanbieter, Offline-Cache-Synchronisierung und ein
Mehrgeräte-Konflikt gegen Supabase sind ohne separates Staging-Projekt und
Testkonten nicht automatisiert. Sie sind Release-Abnahmekriterien, keine
Produktionsautomatisierung. Der komplette JSON-Snapshot nutzt weiterhin
"last write wins"; die Tests dokumentieren Wiederholung, nicht fachliche
Konfliktauflösung.

## CI

`.github/workflows/quality.yml` installiert mit Lockfile, prüft JavaScript,
Unit-/Integrationstests, isolierte Browser-Smokes und `git diff --check`.
Ein separater Java-17-Job erhält die Legacy-Backend-Tests. Der Workflow enthält
keine Schreibrechte, Secrets oder Deploy-Schritte. Ein lokaler Workflow ist
noch kein bestätigter GitHub-Actions-Lauf.
