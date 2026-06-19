-- ===========================================================================
--  Einmalige Migration für E-Mail-Bestätigung + Social-Login (Google/GitHub)
-- ===========================================================================
--
--  NUR auf bereits bestehenden Datenbanken nötig (mit vorhandenen Nutzern).
--  Eine frische DB legt Hibernate (ddl-auto=update) korrekt selbst an.
--
--  Diese Datei ist IDEMPOTENT und deploy-reihenfolge-unabhängig: Sie legt die
--  neuen Spalten genau so an, wie Hibernate sie sonst anlegen würde. Mehrfaches
--  Ausführen oder Ausführen vor/nach dem Deploy ist unproblematisch.
--
--  In Supabase ausführen:  SQL Editor → einfügen → Run.

-- 1) Social-Konten (Google/GitHub) haben KEIN Passwort → Spalte muss NULL erlauben.
--    (Diese eine Änderung nimmt Hibernate per "update" nicht selbst vor.)
ALTER TABLE mt_users ALTER COLUMN password_hash DROP NOT NULL;

-- 2) Neue Spalten anlegen, falls noch nicht vorhanden (sonst übernimmt das Hibernate).
ALTER TABLE mt_users ADD COLUMN IF NOT EXISTS email_verified boolean      NOT NULL DEFAULT false;
ALTER TABLE mt_users ADD COLUMN IF NOT EXISTS provider        varchar(20)  NOT NULL DEFAULT 'LOCAL';
ALTER TABLE mt_users ADD COLUMN IF NOT EXISTS provider_id     varchar(255);

-- 3) Bestehende (vor diesem Update angelegte) Konten als bestätigt markieren,
--    damit sich Alt-Nutzer weiter einloggen können.
UPDATE mt_users SET email_verified = true WHERE email_verified = false;
