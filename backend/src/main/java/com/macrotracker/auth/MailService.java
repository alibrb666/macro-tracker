package com.macrotracker.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Versendet die Bestätigungs-E-Mail über die Resend-HTTP-API (https://api.resend.com).
 *
 * Bewusst HTTP (Port 443) statt SMTP: Hoster wie Railway blockieren ausgehende
 * SMTP-Ports oft, wodurch der Versand ewig hängt. Über die HTTP-API mit festen
 * Connect-/Read-Timeouts schlägt ein Problem schnell und sauber fehl (→ 502),
 * statt die Anfrage hängen zu lassen.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final RestClient rest;

    /** Resend-API-Key. Wird aus der vorhandenen Env-Var MAIL_PASSWORD gelesen. */
    @Value("${app.resend.api-key:}")
    private String apiKey;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.backend-url}")
    private String backendUrl;

    public MailService() {
        SimpleClientHttpRequestFactory f = new SimpleClientHttpRequestFactory();
        f.setConnectTimeout(5000);   // 5 s zum Verbinden
        f.setReadTimeout(15000);     // 15 s auf Antwort — bleibt klar unter dem Frontend-Timeout
        this.rest = RestClient.builder().requestFactory(f).build();
    }

    /** Schickt den Bestätigungslink an die angegebene E-Mail. */
    public void sendVerification(String to, String tokenPlain) {
        String link = backendUrl + "/api/auth/confirm?token=" + tokenPlain;
        String html = """
            <div style="font-family:-apple-system,Segoe UI,sans-serif;max-width:480px;margin:0 auto">
              <h2 style="color:#8b5cf6">🥗 Macro Tracker</h2>
              <p>Willkommen! Bitte bestätige deine E-Mail-Adresse, um dein Konto zu aktivieren.</p>
              <p style="margin:28px 0">
                <a href="%s" style="background:#8b5cf6;color:#fff;text-decoration:none;
                   padding:12px 22px;border-radius:10px;font-weight:700">E-Mail bestätigen</a>
              </p>
              <p style="color:#777;font-size:13px">Falls der Button nicht funktioniert, öffne diesen Link:<br>
                <a href="%s">%s</a></p>
              <p style="color:#777;font-size:13px">Der Link ist 24 Stunden gültig. Wenn du dich nicht
                registriert hast, ignoriere diese Mail einfach.</p>
            </div>
            """.formatted(link, link, link);

        try {
            rest.post()
                .uri("https://api.resend.com/emails")
                .header("Authorization", "Bearer " + apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(Map.of(
                    "from", from,
                    "to", List.of(to),
                    "subject", "Bestätige deine E-Mail · Macro Tracker",
                    "html", html
                ))
                .retrieve()
                .toBodilessEntity();   // wirft bei 4xx/5xx → unten als Fehlversand behandelt
        } catch (Exception e) {
            log.error("Versand der Bestätigungsmail an {} fehlgeschlagen", to, e);
            throw new MailSendFailedException();
        }
    }

    /** Signalisiert, dass der Mailversand fehlschlug (wird als 502 ausgeliefert). */
    public static class MailSendFailedException extends RuntimeException { }
}
