package com.macrotracker.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.Map;

/**
 * Wandelt Fehler in saubere JSON-Antworten um, damit das Frontend sie anzeigen kann.
 * @RestControllerAdvice gilt global für alle Controller.
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
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", message));
    }
}
