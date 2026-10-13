# ADR 0001: Versionierte Outbox statt Last-write-wins-Snapshot

**Status:** vorgeschlagen (SYNC-01A, 13.10.2026)

## Kontext

Der aktuelle direkte JSONB-Upsert ist einfach, kann aber Paralleländerungen und
lokale Pending-Daten still überschreiben.

## Entscheidung

IndexedDB wird die dauerhafte lokale Projektion plus benutzergebundene Outbox.
Supabase PostgreSQL bleibt der einzige Cloud-Dienst und erhält eine additive,
atomare Revision-RPC mit Operations-Deduplication. Konflikte werden erkannt,
persistiert und nur nach expliziter/sicherer Regel aufgelöst.

## Konsequenzen

Mehr Schema- und Testarbeit, aber kein zusätzlicher Service und keine
unbemerkten Last-write-wins-Verluste. Ein vollständig normalisiertes Modell wird
vorerst nicht eingeführt; das versionierte Aggregat bleibt für den kleinen
persönlichen Datensatz wartbar.
