# Testergebnisse – Macro Tracker

Datum: 20.09.2026  
Umgebung: Java 26, Maven, Node.js; Tests ohne Zugriff auf Produktionsdaten oder das Supabase-Produktivkonto.

## Ergebnis

**Status: bestanden.** Der ausführbare Backend-Build und alle vier automatisierten Tests sind erfolgreich.

| Prüfung | Ergebnis | Abdeckung |
|---|---:|---|
| `mvn test` | Bestanden | 4 Tests, 0 Fehler, 0 übersprungen |
| `node --check js/*.js` | Bestanden | Syntax aller Frontend-JavaScript-Dateien |
| `mvn package -DskipTests` | Bestanden | Erzeugt die ausführbare Backend-JAR |
| Whitespace-/Patch-Prüfung | Bestanden | `git diff --check` ohne Befund |

## Simulierter Ablauf

Die neue Testklasse `backend/src/test/java/com/macrotracker/sync/DataStorageFlowTest.java` simuliert den kritischen Datenfluss vollständig lokal und ohne externe Seiteneffekte:

1. Ein gültiges, mit dem Testschlüssel signiertes Supabase-kompatibles JWT wird als Anmeldung akzeptiert.
2. Ohne Token (entspricht Logout) bleibt die Anfrage unauthentifiziert.
3. Ein ungültiges Token wird abgewiesen.
4. Ein Konto speichert einen JSON-Snapshot mit Profil-, Ziel- und Log-Daten.
5. Ein zweiter Speichervorgang desselben Kontos überschreibt den vorherigen Stand (Upsert).
6. Das Konto lädt den aktualisierten Stand wieder.
7. Ein anderes Konto erhält keinen Zugriff auf den gespeicherten Datenblock.

Die bereits vorhandene Testklasse `SupabaseJwtServiceTest` prüft zusätzlich das Auslesen der Benutzer-ID aus einem signierten Token sowie die Ablehnung eines defekten Tokens.

## Nicht als echter End-to-End-Test ausgeführt

Die tatsächliche Kontoerstellung mit E-Mail-Bestätigung, Supabase Auth, Railway-Backend und Supabase PostgreSQL wurde bewusst nicht gegen die produktiven Dienste ausgeführt. Sie würde ein echtes externes Konto anlegen und eventuell eine Bestätigungs-E-Mail versenden. Die lokalen Tests prüfen deshalb die Schnittstelle ab dem erhaltenen JWT sowie die Speicherung isoliert. Vor einem Release sollte dieser Ablauf in einem separaten Supabase-Staging-Projekt per Browser-E2E-Test (z. B. Playwright) ergänzt werden.

Ein erster HTTP-Webtest mit Mockito konnte auf dieser Maschine nicht starten, weil Mockito unter der vorhandenen Java-Version 26 seinen `MockMaker` nicht initialisieren kann. Das ist ein Testumgebungsproblem; die gleichwertige, Mockito-freie lokale Simulation läuft erfolgreich. Für reproduzierbare CI-Läufe sollte Java 17 verwendet werden, passend zur Vorgabe im `pom.xml`.

## Optimierungen mit Priorität

1. **Hoch – Speichern beim Schließen reparieren.** `js/sync.js` verwendet bei `beforeunload` `navigator.sendBeacon(...)`. Ein Beacon kann keinen `Authorization`-Header mitsenden, aber `/api/data` verlangt ein Bearer-JWT. Der finale Schreibversuch wird daher vom Backend abgewiesen. Empfehlung: den finalen Sync mit `fetch(..., { keepalive: true, headers: { Authorization: 'Bearer …' } })` umsetzen und die Größenbeschränkung von Keepalive-Anfragen beachten. Der normale, zeitversetzte Sync funktioniert weiterhin, aber Änderungen unmittelbar vor dem Schließen können verloren gehen.
2. **Hoch – Staging-E2E-Test einrichten.** Kontoerstellung, E-Mail-Weiterleitung/-Bestätigung, Login, Cloud-Sync, Neuladen und Logout sollten in einem isolierten Supabase-Projekt automatisiert getestet werden. Das deckt die aktuell nicht lokal simulierbaren Drittanbieter-Teile ab.
3. **Mittel – Gleichzeitige Änderungen konfliktfest speichern.** Pro Cloud-Konto wird der gesamte Datenbestand als eine JSON-Zeile gespeichert. Zwei Geräte können einander deshalb nach dem Login mit „letzter Schreibvorgang gewinnt“ überschreiben. Empfehlung: Versionsnummer/ETag und Konfliktauflösung einsetzen oder Daten nach Profil/Tag strukturieren.
4. **Mittel – Nutzlast begrenzen und validieren.** Das Backend akzeptiert einen beliebig großen, weitgehend unvalidierten JSON-Block. Eine maximale Request-Größe und Schema-/Feldvalidierung schützen Datenbank, Speicher und Synchronisierung vor fehlerhaften oder übergroßen Daten.
5. **Niedrig – Lokalen PIN nicht als Sicherheitsgrenze behandeln.** Der PIN-Hash im Browser ist ein einfacher, clientseitiger Hash. Er eignet sich nur als Komfortsperre; sensible Zugriffsrechte müssen weiterhin ausschließlich über Supabase Auth abgesichert werden.

## Geänderte Dateien

- `backend/src/test/java/com/macrotracker/sync/DataStorageFlowTest.java` – neue lokale Ablauf- und Isolationstests
- `TESTERGEBNISSE.md` – dieser Bericht
