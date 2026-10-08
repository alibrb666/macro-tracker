# Auth- und Daten-Audit

## Zielarchitektur

Ein Supabase-Auth-Konto entspricht genau einem Kunden und einem privaten
Makro-Tracker-Datensatz. `auth.users` ist die einzige Quelle für
Anmeldedaten; `mt_profiles` enthält nur Anzeigename und Avatar; `mt_cloud_data`
enthält die App-Daten dieses Kontos.

## Erledigte Code-Bereinigung

- Lokale Mehrfachprofile und der vierstellige Browser-PIN entfernt.
- Google und E-Mail/Passwort sind die einzigen angezeigten Login-Wege.
- Passwort-Reset inklusive Setzen des neuen Passworts ergänzt.
- Neue Konten starten ohne Demo-Lebensmittel oder Beispieldaten.
- Bestehende lokale Daten werden beim ersten Konto-Login einmalig in den
  Konto-Speicher übernommen. Alte Cloud-Snapshots werden lokal gesichert,
  bevor sie in das Ein-Profil-Format überführt werden.

## Vor dem Deployment erforderlich

1. `supabase-auth-hardening.sql` im Supabase SQL Editor ausführen.
2. In Supabase Authentication → Providers Google aktivieren und die Google
   OAuth Client-ID sowie das Client-Secret hinterlegen.
3. In Authentication → URL Configuration die Produktionsadresse als Site URL
   und Redirect URL hinterlegen. Bei GitHub Pages ist das die vollständige
   Adresse einschließlich Repository-Pfad.
4. In Google Cloud Console dieselbe Supabase Callback-URL als autorisierte
   Redirect-URI eintragen.
5. Einen echten Test je für Registrierung, Bestätigungs-E-Mail,
   E-Mail-Login, Passwort-Reset, Google-Login sowie Konto-Isolation ausführen.

## Legacy-Tabellen

`mt_app_data`, `mt_email_tokens`, `mt_user_data` und `mt_users` gehören nicht
mehr zum direkten Frontend-Sync. Nicht löschen, bevor ein Export vorliegt und
das Spring-Backend nachweislich nicht mehr darauf zugreift. Anschließend RLS
aktivieren bzw. Tabellen kontrolliert entfernen.
