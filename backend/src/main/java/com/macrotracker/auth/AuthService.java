package com.macrotracker.auth;

import com.macrotracker.auth.dto.AuthDtos.AuthRequest;
import com.macrotracker.auth.dto.AuthDtos.AuthResponse;
import com.macrotracker.auth.dto.AuthDtos.RegisterResponse;
import com.macrotracker.security.JwtService;
import com.macrotracker.user.AppUser;
import com.macrotracker.user.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import java.util.Optional;

/**
 * Die Geschäftslogik für Registrierung, Login und E-Mail-Bestätigung.
 */
@Service
public class AuthService {

    private final UserRepository users;
    private final EmailVerificationTokenRepository tokens;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final MailService mailService;

    @Value("${app.verification.expiry-hours:24}")
    private long expiryHours;

    private final SecureRandom random = new SecureRandom();

    public AuthService(UserRepository users,
                       EmailVerificationTokenRepository tokens,
                       PasswordEncoder passwordEncoder,
                       JwtService jwtService,
                       MailService mailService) {
        this.users = users;
        this.tokens = tokens;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.mailService = mailService;
    }

    /** Neues Konto anlegen (unbestätigt), Bestätigungsmail verschicken. Kein Token zurück. */
    public RegisterResponse register(AuthRequest req) {
        String email = req.email().trim().toLowerCase();
        if (users.existsByEmail(email)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "E-Mail ist bereits registriert");
        }
        AppUser user = new AppUser(email, passwordEncoder.encode(req.password()));
        users.save(user);
        issueAndSendToken(user);
        return new RegisterResponse("verification_sent", email);
    }

    /** Anmelden: nur mit korrektem Passwort UND bestätigter E-Mail. */
    public AuthResponse login(AuthRequest req) {
        String email = req.email().trim().toLowerCase();
        AppUser user = users.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-Mail oder Passwort falsch"));

        // Social-Konten ohne Passwort: hier nicht per Passwort anmeldbar.
        if (user.getPasswordHash() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Dieses Konto wurde über " + user.getProvider() + " erstellt — bitte darüber anmelden.");
        }
        if (!passwordEncoder.matches(req.password(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "E-Mail oder Passwort falsch");
        }
        if (!user.isEmailVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "E-Mail noch nicht bestätigt");
        }
        String token = jwtService.createToken(user.getId(), user.getEmail());
        return new AuthResponse(token, user.getEmail());
    }

    /**
     * Bestätigungslink einlösen. Gibt true zurück bei Erfolg, false bei
     * ungültigem/abgelaufenem/bereits benutztem Token.
     */
    public boolean confirm(String tokenPlain) {
        if (tokenPlain == null || tokenPlain.isBlank()) return false;
        Optional<EmailVerificationToken> opt = tokens.findByTokenHash(sha256(tokenPlain));
        if (opt.isEmpty()) return false;
        EmailVerificationToken t = opt.get();
        if (t.getUsedAt() != null || t.getExpiresAt().isBefore(Instant.now())) return false;

        AppUser user = users.findById(t.getUserId()).orElse(null);
        if (user == null) return false;
        user.setEmailVerified(true);
        users.save(user);
        t.setUsedAt(Instant.now());
        tokens.save(t);
        return true;
    }

    /**
     * Bestätigungsmail erneut senden. Aus Datenschutzgründen wird nicht verraten,
     * ob die E-Mail existiert — der Aufrufer bekommt immer eine neutrale Antwort.
     */
    public void resend(String email) {
        String e = email.trim().toLowerCase();
        users.findByEmail(e).ifPresent(user -> {
            if (!user.isEmailVerified() && user.getPasswordHash() != null) {
                issueAndSendToken(user);
            }
        });
    }

    /**
     * Findet ein Konto per E-Mail oder legt ein neues Social-Konto an, und gibt
     * ein frisches JWT zurück. Genutzt vom OAuth2-Login (Google/GitHub).
     */
    public String findOrCreateOAuthAndToken(String email, String provider, String providerId) {
        String e = email.trim().toLowerCase();
        AppUser user = users.findByEmail(e).orElse(null);
        if (user == null) {
            user = new AppUser(e, provider, providerId);
            users.save(user);
        } else if (!user.isEmailVerified()) {
            // Konto existierte (z. B. lokal, unbestätigt) → der Anbieter hat die
            // E-Mail verifiziert, also als bestätigt markieren (Account-Linking).
            user.setEmailVerified(true);
            users.save(user);
        }
        return jwtService.createToken(user.getId(), user.getEmail());
    }

    // ── Helfer ──────────────────────────────────────────────────────────────

    private void issueAndSendToken(AppUser user) {
        tokens.deleteByUserId(user.getId());     // alte offene Tokens entwerten
        String plain = randomToken();
        EmailVerificationToken t = new EmailVerificationToken(
                user.getId(), sha256(plain), Instant.now().plus(expiryHours, ChronoUnit.HOURS));
        tokens.save(t);
        mailService.sendVerification(user.getEmail(), plain);
    }

    private String randomToken() {
        byte[] buf = new byte[32];
        random.nextBytes(buf);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(buf);
    }

    private String sha256(String s) {
        try {
            byte[] h = MessageDigest.getInstance("SHA-256").digest(s.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(h.length * 2);
            for (byte b : h) sb.append(String.format("%02x", b));
            return sb.toString();
        } catch (Exception ex) {
            throw new IllegalStateException("SHA-256 nicht verfügbar", ex);
        }
    }
}
