package com.macrotracker.auth;

import com.macrotracker.auth.dto.AuthDtos.AuthRequest;
import com.macrotracker.auth.dto.AuthDtos.AuthResponse;
import com.macrotracker.auth.dto.AuthDtos.RegisterResponse;
import com.macrotracker.auth.dto.AuthDtos.ResendRequest;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

/**
 * REST-Controller für Anmeldung & E-Mail-Bestätigung.
 *
 *   POST /api/auth/register  → Konto anlegen, Bestätigungsmail senden
 *   POST /api/auth/login     → einloggen (nur mit bestätigter E-Mail)
 *   GET  /api/auth/confirm    → Bestätigungslink einlösen, dann zur App umleiten
 *   POST /api/auth/resend     → Bestätigungsmail erneut anfordern
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public RegisterResponse register(@Valid @RequestBody AuthRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }

    /**
     * Wird beim Klick auf den Link in der Mail aufgerufen (normale Browser-
     * Navigation). Leitet danach zurück in die App — mit ?confirmed=1 bzw. =0.
     */
    @GetMapping("/confirm")
    public ResponseEntity<Void> confirm(@RequestParam("token") String token) {
        boolean ok = authService.confirm(token);
        String target = frontendUrl + (frontendUrl.contains("?") ? "&" : "?")
                + "confirmed=" + (ok ? "1" : "0");
        return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(target)).build();
    }

    @PostMapping("/resend")
    public Map<String, String> resend(@Valid @RequestBody ResendRequest request) {
        authService.resend(request.email());
        // Neutrale Antwort — verrät nicht, ob die E-Mail existiert.
        return Map.of("status", "ok");
    }
}
