package com.macrotracker.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

/**
 * Prüft die von Supabase Auth ausgestellten JWTs (HS256, signiert mit dem
 * Projekt-JWT-Secret aus Supabase → Settings → API → "JWT Secret").
 *
 * Wir stellen KEINE eigenen Tokens mehr aus — Supabase übernimmt Login,
 * Registrierung, E-Mail-Bestätigung und Google/GitHub. Das Backend vertraut nur
 * gültigen Supabase-Tokens und liest daraus die User-ID (Claim "sub" = UUID).
 */
@Service
public class SupabaseJwtService {

    private final SecretKey key;

    public SupabaseJwtService(@Value("${supabase.jwt-secret}") String secret) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }

    /** Validiert das Token und gibt die Supabase-User-ID (UUID) zurück. Wirft bei Ungültigkeit. */
    public String parseUserId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(key)
                .build()
                .parseSignedClaims(token)
                .getPayload();
        return claims.getSubject();   // "sub" = Supabase user UUID
    }
}
