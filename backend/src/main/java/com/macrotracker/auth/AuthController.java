package com.macrotracker.auth;

import com.macrotracker.auth.dto.AuthDtos.AuthRequest;
import com.macrotracker.auth.dto.AuthDtos.AuthResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

/**
 * REST-Controller für Anmeldung.
 *
 * @RestController + @RequestMapping definieren HTTP-Endpunkte. Spring wandelt
 * eingehendes JSON automatisch in AuthRequest um und die Rückgabe wieder in JSON.
 *
 *   POST /api/auth/register  → Konto anlegen
 *   POST /api/auth/login     → einloggen
 */
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public AuthResponse register(@Valid @RequestBody AuthRequest request) {
        return authService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody AuthRequest request) {
        return authService.login(request);
    }
}
