package com.macrotracker.appdata;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Datenzugriff für den JSON-Datenblock. Schlüssel ist die Supabase-User-UUID (String).
 */
public interface AppDataRepository extends JpaRepository<AppData, String> {
}
