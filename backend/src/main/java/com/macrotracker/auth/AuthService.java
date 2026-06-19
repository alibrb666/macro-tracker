package com.macrotracker.auth;

import com.macrotracker.auth.dto.AuthDtos.AuthRequest;
import com.macrotracker.auth.dto.AuthDtos.AuthResponse;
import com.macrotracker.security.JwtService;
import com.macrotracker.user.AppUser;
import com.macrotracker.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/**
 * Die Geschäftslogik für Registrierung und Login.
 *
 * Ein @Service bündelt fachliche Logik und steht zwischen Controller (HTTP)
 * und Repository (Datenbank). So bleibt der Controller schlank.
 */
@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    // Konstruktor-Injektion: Spring übergibt die benötigten Bausteine automatisch.
    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    /** Neues Konto anlegen. E-Mail muss frei sein, Passwort wird gehasht gespeichert. */
    public AuthResponse register(AuthRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-Mail ist bereits registriert");
        }
        AppUser user = new AppUser(email, passwordEncoder.encode(req.password()));
        users.save(user);
        String token = jwtService.createToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getEmail());
    }

    /** Anmelden: E-Mail finden, Passwort gegen den Hash prüfen, Token ausstellen. */
    public AuthResponse login(AuthRequest req) {
        String email = req.email().trim().toLowerCase();
        AppUser user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-Mail oder Passwort falsch"));

        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-Mail oder Passwort falsch");
        }
        String token = jwtService.createToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getEmail());
    }
}
