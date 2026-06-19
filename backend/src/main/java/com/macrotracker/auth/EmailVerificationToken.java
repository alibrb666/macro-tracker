package com.macrotracker.auth;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Ein einmaliger Bestätigungs-Token für die E-Mail-Verifizierung.
 *
 * Gespeichert wird nur der HASH des Tokens (nicht der Klartext) — wie beim
 * Passwort. Der Klartext steht ausschließlich im Bestätigungslink in der Mail.
 * Jeder Token gehört zu einem Benutzer, läuft ab und ist nur einmal verwendbar.
 */
@Entity
@Table(name = "mt_email_tokens")
public class EmailVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    /** SHA-256-Hash (hex) des Token-Klartexts. */
    @Column(name = "token_hash", nullable = false, unique = true)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    /** Gesetzt, sobald der Token eingelöst wurde — verhindert Mehrfachnutzung. */
    @Column(name = "used_at")
    private Instant usedAt;

    protected EmailVerificationToken() { }

    public EmailVerificationToken(Long userId, String tokenHash, Instant expiresAt) {
        this.userId = userId;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public String getTokenHash() { return tokenHash; }
    public Instant getExpiresAt() { return expiresAt; }
    public Instant getUsedAt() { return usedAt; }
    public void setUsedAt(Instant usedAt) { this.usedAt = usedAt; }
}
