package com.macrotracker.user;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Ein Benutzerkonto (Cloud-Login).
 *
 * @Entity sagt JPA/Hibernate: "Mappe diese Klasse auf eine Datenbanktabelle".
 * Jede Instanz = eine Zeile in der Tabelle "mt_users".
 *
 * Ein Konto entsteht entweder klassisch (E-Mail + Passwort, provider = LOCAL)
 * oder über einen externen Anbieter (Google/GitHub, dann ohne Passwort).
 */
@Entity
@Table(name = "mt_users")
public class AppUser {

    /** Primärschlüssel, von der Datenbank automatisch hochgezählt. */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** E-Mail = Anmeldename, muss eindeutig sein. */
    @Column(nullable = false, unique = true)
    private String email;

    /**
     * BCrypt-Hash des Passworts. NULL bei reinen Social-Logins (Google/GitHub),
     * die kein Passwort haben. Niemals das Klartext-Passwort speichern.
     */
    @Column(name = "password_hash")
    private String passwordHash;

    /**
     * Ist die E-Mail bestätigt? Bei Social-Logins automatisch true (Provider hat verifiziert).
     *
     * columnDefinition mit Default, damit ddl-auto=update die Spalte auch auf einer
     * Tabelle mit bereits vorhandenen Zeilen anlegen kann (Postgres verlangt sonst
     * einen Default für NOT-NULL-Spalten). nullable bewusst NICHT gesetzt, sonst
     * hängt Hibernate ein zweites "not null" an.
     */
    @Column(name = "email_verified", columnDefinition = "boolean not null default false")
    private boolean emailVerified = false;

    /** Woher stammt das Konto: LOCAL, GOOGLE oder GITHUB. */
    @Column(columnDefinition = "varchar(20) not null default 'LOCAL'")
    private String provider = "LOCAL";

    /** ID des Nutzers beim externen Anbieter (z. B. die Google-/GitHub-User-ID). NULL bei LOCAL. */
    @Column(name = "provider_id")
    private String providerId;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    // JPA braucht einen leeren Konstruktor.
    protected AppUser() { }

    /** Klassisches Konto mit Passwort. */
    public AppUser(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now();
    }

    /** Konto über einen externen Anbieter (kein Passwort, E-Mail gilt als bestätigt). */
    public AppUser(String email, String provider, String providerId) {
        this.email = email;
        this.provider = provider;
        this.providerId = providerId;
        this.emailVerified = true;
        this.createdAt = Instant.now();
    }

    // Getter/Setter — JPA und der Code lesen/schreiben Felder darüber.
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public boolean isEmailVerified() { return emailVerified; }
    public void setEmailVerified(boolean emailVerified) { this.emailVerified = emailVerified; }
    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }
    public Instant getCreatedAt() { return createdAt; }
}
