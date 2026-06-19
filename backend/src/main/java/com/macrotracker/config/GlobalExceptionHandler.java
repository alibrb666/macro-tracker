package com.macrotracker.config;

import com.macrotracker.auth.MailService;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Wandelt Fehler in saubere JSON-Antworten um, damit das Frontend sie anzeigen kann.
 * @RestControllerAdvice gilt global für alle Controller.
 *
 * Wichtig: Wir geben die Fehler DIREKT als ResponseEntity zurück. Damit vermeiden
 * wir die interne Weiterleitung auf "/error" (die sonst von Spring Security
 * geblockt würde und fälschlich 403 statt z. B. 401 liefern würde).
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    /** Validierungsfehler (@Valid) → 400 mit der ersten verständlichen Meldung. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException ex) {
        String message = ex.getBindingResult().getFieldErrors().stream()
                .findFirst()
                .map(e -> e.getDefaultMessage())
                .orElse("Ungültige Eingabe");
        return ResponseEntity.badRequest().body(Map.of("error", message));
    }

    /** Fachliche Fehler (z. B. 401 falsches Passwort, 409 E-Mail vergeben) → sauberes JSON. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : "Fehler";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message));
    }

    /**
     * Verletzung einer DB-Constraint. Praktisch nur die eindeutige E-Mail: zwei
     * gleichzeitige Registrierungen kommen am existsByEmail-Check vorbei und lösen
     * dann diesen Fehler aus → sauberes 409 statt eines generischen 500.
     */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleIntegrity(DataIntegrityViolationException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(Map.of("error", "E-Mail ist bereits registriert"));
    }

    /** Bestätigungsmail konnte nicht versendet werden → 502, damit das Frontend es meldet. */
    @ExceptionHandler(MailService.MailSendFailedException.class)
    public ResponseEntity<Map<String, String>> handleMail(MailService.MailSendFailedException ex) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY)
                .body(Map.of("error", "Bestätigungsmail konnte nicht gesendet werden. Bitte später erneut versuchen."));
    }
}
