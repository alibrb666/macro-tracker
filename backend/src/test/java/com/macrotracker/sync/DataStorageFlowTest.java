package com.macrotracker.sync;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.macrotracker.appdata.AppData;
import com.macrotracker.appdata.AppDataRepository;
import com.macrotracker.security.JwtAuthFilter;
import com.macrotracker.security.SupabaseJwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import javax.crypto.SecretKey;
import java.lang.reflect.Proxy;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Lokale Simulation des Speichern-und-Wiederherstellen-Ablaufs. Der Repository-
 * Ersatz hält Daten nur im Speicher; weder Supabase noch PostgreSQL werden berührt.
 */
class DataStorageFlowTest {
    private static final String SECRET = "storage-flow-test-secret-mindestens-32-zeichen!";

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void accountDataCanBeSavedUpdatedAndReadBackWithoutLeakingToAnotherAccount() throws Exception {
        Map<String, AppData> rows = new HashMap<>();
        AppDataRepository repo = inMemoryRepository(rows);
        DataController controller = new DataController(repo, new ObjectMapper());
        ObjectMapper json = new ObjectMapper();

        var firstSnapshot = json.readTree("""
                {"v":1,"users":[{"id":"local-1","name":"Test"}],
                 "profiles":{"local-1":{"goals":{"kcal":2000},"log":{"2026-09-20":[]}}}}
                """);
        var updatedSnapshot = json.readTree("""
                {"v":1,"users":[{"id":"local-1","name":"Test"}],
                 "profiles":{"local-1":{"goals":{"kcal":2200},"log":{"2026-09-20":[]}}}}
                """);

        controller.put("account-a", new DataController.DataRequest(firstSnapshot));
        controller.put("account-a", new DataController.DataRequest(updatedSnapshot));

        assertEquals(2200, controller.get("account-a").data().at("/profiles/local-1/goals/kcal").asInt());
        assertNull(controller.get("account-b").data(), "Ein anderes Konto darf keinen fremden Datenblock erhalten.");
        assertEquals(1, rows.size(), "Mehrfaches Speichern desselben Kontos muss ein Upsert bleiben.");
    }

    @Test
    void loginAndLogoutSessionAreDistinguishedByTheApiFilter() throws Exception {
        SupabaseJwtService service = new SupabaseJwtService(SECRET);
        JwtAuthFilter filter = new JwtAuthFilter(service);

        MockHttpServletRequest signedIn = new MockHttpServletRequest();
        signedIn.addHeader("Authorization", "Bearer " + tokenFor("account-a"));
        filter.doFilter(signedIn, new MockHttpServletResponse(), new MockFilterChain());
        assertEquals("account-a", SecurityContextHolder.getContext().getAuthentication().getPrincipal());

        SecurityContextHolder.clearContext(); // simuliert Logout: kein Token wird mehr gesendet
        filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(), new MockFilterChain());
        assertNull(SecurityContextHolder.getContext().getAuthentication());

        MockHttpServletRequest invalid = new MockHttpServletRequest();
        invalid.addHeader("Authorization", "Bearer invalid-token");
        filter.doFilter(invalid, new MockHttpServletResponse(), new MockFilterChain());
        assertNull(SecurityContextHolder.getContext().getAuthentication());
    }

    private String tokenFor(String subject) {
        SecretKey key = Keys.hmacShaKeyFor(SECRET.getBytes(StandardCharsets.UTF_8));
        return Jwts.builder().subject(subject).issuedAt(new Date())
                .expiration(new Date(System.currentTimeMillis() + 60_000)).signWith(key).compact();
    }

    @SuppressWarnings("unchecked")
    private AppDataRepository inMemoryRepository(Map<String, AppData> rows) {
        return (AppDataRepository) Proxy.newProxyInstance(
                getClass().getClassLoader(), new Class<?>[]{AppDataRepository.class}, (proxy, method, args) -> {
                    return switch (method.getName()) {
                        case "findById" -> Optional.ofNullable(rows.get(args[0]));
                        case "save" -> {
                            AppData data = (AppData) args[0];
                            rows.put(data.getUserId(), data);
                            yield data;
                        }
                        case "toString" -> "in-memory AppDataRepository";
                        default -> throw new UnsupportedOperationException(method.getName());
                    };
                });
    }
}
