package com.macrotracker.user;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Repository = Daten-Zugriffsschicht.
 *
 * Spring Data JPA erzeugt die Implementierung dieses Interfaces ZUR LAUFZEIT
 * automatisch. Von JpaRepository bekommst du fertige Methoden geschenkt:
 * save(), findById(), findAll(), delete() ...
 *
 * Zusätzlich reicht es, eine Methode nach Namens-Konvention zu deklarieren —
 * "findByEmail" wird automatisch in "SELECT ... WHERE email = ?" übersetzt.
 */
public interface UserRepository extends JpaRepository<AppUser, Long> {

    Optional<AppUser> findByEmail(String email);

    boolean existsByEmail(String email);
}
