-- ===========================================================================
--  Einmalige Migration für E-Mail-Bestätigung + Social-Login (Google/GitHub)
-- ===========================================================================
--
--  NUR auf bereits bestehenden Datenbanken nötig (mit vorhandenen Nutzern).
--  Eine frische DB legt Hibernate (ddl-auto=update) korrekt selbst an.
--
--  In Supabase ausführen:  SQL Editor → einfügen → Run.
--
--  Hintergrund:
--   * email_verified / provider / provider_id  legt Hibernate beim Start
--     automatisch an (mit Default), das muss man NICHT manuell machen.
--   * password_hash war früher NOT NULL. Social-Konten (Google/GitHub) haben
--     KEIN Passwort → die Spalte muss NULL erlauben. Diese eine Änderung nimmt
--     Hibernate per "update" NICHT vor, daher hier manuell:

ALTER TABLE mt_users ALTER COLUMN password_hash DROP NOT NULL;

-- Optional: bestehende (vor diesem Update angelegte) Konten als bestätigt
-- markieren, damit sich Alt-Nutzer weiter einloggen können, ohne dass
-- nachträglich eine Bestätigungsmail nötig wird:

UPDATE mt_users SET email_verified = true WHERE email_verified = false;
