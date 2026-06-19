package com.macrotracker.auth;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/** Datenzugriff für die E-Mail-Bestätigungs-Tokens. */
public interface EmailVerificationTokenRepository extends JpaRepository<EmailVerificationToken, Long> {

    Optional<EmailVerificationToken> findByTokenHash(String tokenHash);

    /** Alte/offene Tokens eines Nutzers entfernen, bevor ein neuer ausgestellt wird. */
    @Modifying
    @Transactional
    void deleteByUserId(Long userId);
}
