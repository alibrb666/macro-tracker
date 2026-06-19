package com.macrotracker.config;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

/**
 * Wandelt Fehler in saubere JSON-Antworten um, damit das Frontend sie anzeigen kann.
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

    /** Fachliche Fehler → sauberes JSON mit passendem Statuscode. */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(ResponseStatusException ex) {
        String message = ex.getReason() != null ? ex.getReason() : "Fehler";
        return ResponseEntity.status(ex.getStatusCode()).body(Map.of("error", message));
    }
}
