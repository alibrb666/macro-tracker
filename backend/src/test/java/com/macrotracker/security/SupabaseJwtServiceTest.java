package com.macrotracker.security;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.Test;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit-Test (ohne Spring-Kontext): ein mit dem Secret signiertes Token wird
 * akzeptiert und die User-ID (sub) korrekt ausgelesen; Müll wird abgelehnt.
 */
class SupabaseJwtServiceTest {

    private static final String SECRET = "test-supabase-jwt-secret-mindestens-32-zeichen!!";
    private final SupabaseJwtService svc = new SupabaseJwtService(SECRET);

    private String sign(String sub) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder()
                .subject(sub)
                .issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000))
                .signWith(key)
                .compact();
    }

    @Test
    void parsesSubject() {
        String uuid = "11111111-2222-3333-4444-555555555555";
        assertEquals(uuid, svc.parseUserId(sign(uuid)));
    }

    @Test
    void rejectsGarbage() {
        assertThrows(Exception.class, () -> svc.parseUserId("kein-echtes-token"));
    }
}
