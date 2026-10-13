# Sync-Architektur (SYNC-01A)

Stand: 13.10.2026. Analyse und Planung; kein Produktionscode, keine SQL-Änderung
und kein Supabase-Zugriff wurden ausgeführt.

## Ist-Zustand

```text
Fachfunktion → db mutieren → save()
  → localStorage[mt-data-<auth.uid>] = JSON.stringify(db)
  → (bei Session) Debounce 1,5 s → mt_cloud_data.upsert({user_id,data,savedAt})

Login/focus/visible → cloudPull() → select(data) → localStorage/db vollständig ersetzen
```

`db` ist ein einzelnes JSON-Aggregat: Lebensmittel, Tageslog, Ziele, Profil,
Gewichte, Wasser/Wasserereignisse, Fastenplan/-historie und Training. Jede
Fachfunktion (Ernährung, Training, Gewicht, Wasser, Ziele, Einstellungen) ruft
nach einer Mutation `save()` auf. `mt_cloud_data` hält einen JSONB-Snapshot pro
Supabase-User; RLS isoliert nach `auth.uid()`. `mt_profiles` enthält nur Namen
und Avatar.

`save()` persistiert zuerst synchron in LocalStorage. `cloudSyncSoon()` arbeitet
nur bei vorhandenem Token. `cloudPush()` führt einen bedingungslosen Upsert aus;
`cloudPull()` übernimmt den Remote-Snapshot beim Login, Fokus oder Sichtbarwerden.
`beforeunload` startet noch einen nicht abgewarteten Push. Es gibt keinen
Online-Listener, keine Outbox, keine Revision, keine serverseitige Transaktion
für den Dateninhalt und keine Konfliktoberfläche. Der vorhandene Test prüft
Upsert, abgelaufene Session, Fehleranzeige und einen idempotenten Pull-Mock;
er prüft keine Parallelität.

## Befunde und Priorität

| Priorität | Befund | Auswirkung |
|---|---|---|
| P0 | Zwei Geräte schreiben denselben Snapshot ohne Versionsprüfung. | Letzter Schreibvorgang löscht bestätigte Änderungen des anderen Geräts. |
| P0 | Pull ersetzt lokale Daten trotz möglicher ausstehender Änderungen. | Offline-/frische lokale Änderungen können unbemerkt verloren gehen. |
| P0 | Browser-Schließen/Logout wartet nicht auf eine dauerhafte Sync-Bestätigung. | Änderungen bleiben nur zufällig im LocalStorage oder gehen bei Speicherverlust verloren. |
| P1 | LocalStorage und ein 1,5-s-Debounce bilden keine durable Outbox. | Kein nachvollziehbarer Retry, keine Wiederaufnahme nach Absturz, kein Sendestatus. |
| P1 | Gleichzeitige Focus-, Login-, Timer- und manueller Push/Pull-Aufrufe sind nicht serialisiert. | Races, doppelte Requests, wechselnde UI-Marker. |
| P1 | Ein `auth.uid()`-Wechsel trennt UI-Daten logisch, aber nicht über eine transaktionale lokale Queue. | Fehlerhafte Zuordnung/Versand beim Wechsel muss künftig ausgeschlossen werden. |
| P2 | Wasser-/Trainings-/Log-Listen und manche Altobjekte haben keine garantiert stabile globale ID. | Selektives, idempotentes Mergen ist nicht zuverlässig möglich. |
| P2 | Netzwerkfehler werden angezeigt, aber weder klassifiziert noch mit Backoff fortgesetzt. | Dauerhafte Offline-Nutzung erzeugt unklaren Sync-Zustand. |
| P3 | Legacy-v1-Snapshot wird heuristisch übernommen. | Migration ist nicht explizit versioniert oder rückrollbar. |

## Zielentscheidung

**Supabase-only mit IndexedDB-Projektion, benutzergebundener Outbox und
PostgreSQL-Revision (OCC).** Keine zusätzliche SaaS, kein eigener Server und
keine UI-Frameworks.

1. **IndexedDB:** Browser-native Stores `documents`, `outbox`, `meta`, jeweils
   mit `user_id` im Schlüssel. Eine IndexedDB-Transaktion schreibt fachliche
   Projektion, Outbox-Operation und Status, bevor die UI Erfolg meldet.
   LocalStorage bleibt während der Migration nur lesbarer Import-/Fallback.
2. **Operationen:** Jede Änderung ist eine immutable Operation mit UUID,
   `user_id`, `entity_type`, `entity_id`, `kind`, Payload, `base_revision`,
   Zeitstempel und Versuchszähler. Löschen ist ein Tombstone, kein lokales
   Wegwerfen. Bestehende Lebensmittel-/Log-IDs werden validiert, fehlende IDs
   einmalig ergänzt; Gewicht ist eine deterministische Entität `date`, alle
   Ereignislisten erhalten UUIDs.
3. **Ein serieller Sync-Worker pro User:** Nur er darf senden oder pullen.
   Online-, Fokus-, Sichtbarkeits-, manueller und Login-Trigger signalisieren
   ihm lediglich Arbeit. Exponentieller Backoff mit Jitter läuft nur online;
   Auth-/Berechtigungsfehler pausieren und verlangen erneute Anmeldung.
4. **Atomare Serverrevision:** Ein SECURITY-INVOKER PostgreSQL-RPC prüft
   `auth.uid()`, sperrt die eigene State-Zeile, dedupliziert `op_id`s und
   akzeptiert eine Batch nur bei passender `base_revision`. Die Revision steigt
   atomar. Bei Abweichung liefert sie kanonischen Stand plus Revision, ohne
   lokale Operationen zu verwerfen.
5. **Konflikt:** Der Client rebaset nur nach klaren Regeln (disjunkte Entitäten,
   additive Ereignisse, identische idempotente Operation). Gleichzeitige
   Änderungen derselben Entität, Delete-vs-Update oder nicht interpretierbare
   Altformate erzeugen einen persistierten Konflikt und eine UI-Entscheidung;
   niemals stilles Last-write-wins.

Ein relationales Modell für jedes Food/Log/Event wäre langfristig abfragbarer,
bringt aber umfangreiche RLS-, Migration- und API-Komplexität. Für den aktuellen
persönlichen, begrenzten Datensatz ist ein **versioniertes JSON-Dokument als
kanonische Projektion plus append-only Operationsledger** der kleinste sichere
Schritt. Vollständige Snapshots sind nur für initiale, explizite Migration oder
Recovery erlaubt und immer durch erwartete Revision geschützt.

## Datenbank-Sollmodell

`mt_cloud_data` wird nicht in-place umgedeutet. Neue additive Tabellen/RPCs:

| Objekt | Zweck |
|---|---|
| `mt_sync_state(user_id PK, revision bigint, schema_version int, data jsonb, updated_at)` | Kanonische, versionierte Projektion je User |
| `mt_sync_operations(user_id, op_id, applied_revision, received_at, PK(user_id, op_id))` | Deduplication/Audit für wiederholte Batches |
| `apply_sync_batch(expected_revision, operations jsonb)` | Atomare, RLS-gebundene CAS-Anwendung; kein Client-Write auf State/Operations |

RLS erlaubt dem Client nur den eigenen State-Read. Inserts/Updates erfolgen
allein über die RPC; der RPC validiert Größen, Operationstypen, Owner und
Schema-Version. `mt_cloud_data` bleibt unverändert als read-only Migrationsquelle
bis zum expliziten Retention-Ende.

## Sicherheits- und Lifecycle-Regeln

- Outbox und Projektion sind immer an die bestätigte `user_id` gebunden; ein
  Worker stoppt vor Logout und darf keine fremde Queue senden.
- Logout zeigt bei unbestätigten Änderungen „lokal sicher gespeichert,
  Synchronisierung ausstehend“ und bietet Abmelden/Abbrechen; es verwirft nie
  Daten. Login eines anderen Users lädt ausschließlich dessen IndexedDB-Keyspace.
- `visibilitychange` und `pagehide` dürfen Flush anstoßen, sind aber nie die
  einzige Persistenzgarantie. Nach Reload startet der Worker aus der Outbox.
- Serverantworten und Remote-Stand werden erst nach User-, Schema- und
  Revisionsprüfung übernommen. Remote-Pull darf keine lokale Pending-Operation
  überschreiben.

## Verifizierbare Zieltests

- Unit: UUID-/Operationserzeugung, Schema-Migration, Rebase-Regeln, Backoff und
  User-Key-Isolation.
- IndexedDB-Integration: Atomare Projektion+Outbox, Reload/Crash zwischen UI und
  Sendung, Quota-/Transaktionsfehler.
- RPC/Staging: Revision-Mismatch, doppelte `op_id`, fremde User-ID, RLS und
  Batch-Atomizität.
- Zwei Browser-Kontexte: offline A/B, parallele Änderung derselben/disjunkter
  Entitäten, Pull während Pending, Logout/Login-Wechsel und Recovery.
