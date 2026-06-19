package com.macrotracker.appdata;

import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Datenzugriff für den JSON-Datenblock. Schlüssel ist die User-ID (Long).
 */
public interface AppDataRepository extends JpaRepository<AppData, Long> {
}
