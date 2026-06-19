package com.macrotracker.config;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Einfacher Status-Endpunkt. Hoster (z. B. Render) prüfen darüber, ob die App läuft.
 */
@RestController
public class HealthController {

    @GetMapping({"/", "/health"})
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "macro-tracker-backend");
    }
}
