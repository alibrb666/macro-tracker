package com.macrotracker.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * DTOs ("Data Transfer Objects") = die Formen der JSON-Daten für die API.
 * Java "records" sind kurze, unveränderliche Datenträger.
 * Die @-Annotationen prüfen die Eingaben automatisch (Validierung).
 */
public class AuthDtos {

    /** Anfrage-Körper für Registrierung und Login. */
    public record AuthRequest(
            @Email(message = "Ungültige E-Mail")
            @NotBlank(message = "E-Mail fehlt")
            String email,

            @NotBlank(message = "Passwort fehlt")
            @Size(min = 6, message = "Passwort muss mind. 6 Zeichen haben")
            String password
    ) { }

    /** Antwort nach erfolgreichem Login: das Token + die E-Mail. */
    public record AuthResponse(String token, String email) { }

    /**
     * Antwort nach der Registrierung: KEIN Token, denn erst muss die E-Mail
     * bestätigt werden. status = "verification_sent".
     */
    public record RegisterResponse(String status, String email) { }

    /** Anfrage-Körper für "Bestätigungsmail erneut senden". */
    public record ResendRequest(
            @Email(message = "Ungültige E-Mail")
            @NotBlank(message = "E-Mail fehlt")
            String email
    ) { }
}
