package com.macrotracker.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

/**
 * Erzeugt und prüft JWTs (JSON Web Tokens).
 *
 * Ein JWT ist ein signierter Text, den der Client nach dem Login speichert und
 * bei jeder Anfrage mitschickt ("Authorization: Bearer <token>"). Das Backend
 * prüft die Signatur und weiß so, WER anfragt — ohne Session auf dem Server.
 */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms}") long expirationMs) {
        // Der Geheimschlüssel signiert die Tokens. Muss lang & geheim sein (aus Umgebungsvariable).
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
    }

    /** Erzeugt ein Token für einen Benutzer. subject = User-ID, zusätzlich die E-Mail. */
    public String createToken(Long userId, String email) {
        Date now = new Date();
        return Jwts.builder()
                .subject(String.valueOf(userId))
                .claim("email", email)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Liest die User-ID aus einem gültigen Token. Wirft eine Exception, wenn ungültig/abgelaufen. */
    public Long parseUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return Long.valueOf(claims.getSubject());
    }
}
