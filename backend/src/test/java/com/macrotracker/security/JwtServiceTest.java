package com.macrotracker.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Ein einfacher Unit-Test (ohne Datenbank, ohne Spring-Kontext).
 * Er prüft: Ein erzeugtes Token liefert beim Auslesen wieder dieselbe User-ID.
 *
 * Ausführen mit:  mvn test
 */
class JwtServiceTest {

    private final JwtService jwt = new JwtService(
            "test-geheimnis-mindestens-zweiunddreissig-zeichen!!", // >= 32 Zeichen
            60_000 // 1 Minute gültig
    );

    @Test
    void tokenRoundTrip() {
        String token = jwt.createToken(42L, "a@b.de");
        assertEquals(42L, jwt.parseUserId(token));
    }

    @Test
    void invalidTokenThrows() {
        assertThrows(Exception.class, () -> jwt.parseUserId("kein-echtes-token"));
    }
}
