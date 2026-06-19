package com.macrotracker.user;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * Ein Benutzerkonto (Cloud-Login).
 *
 * @Entity sagt JPA/Hibernate: "Mappe diese Klasse auf eine Datenbanktabelle".
 * Jede Instanz = eine Zeile in der Tabelle "mt_users".
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

    /** NUR der BCrypt-Hash des Passworts wird gespeichert, niemals das Klartext-Passwort. */
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    // JPA braucht einen leeren Konstruktor.
    protected AppUser() { }

    public AppUser(String email, String passwordHash) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.createdAt = Instant.now();
    }

    // Getter/Setter — JPA und der Code lesen/schreiben Felder darüber.
    public Long getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public void setPasswordHash(String passwordHash) { this.passwordHash = passwordHash; }
    public Instant getCreatedAt() { return createdAt; }
}
