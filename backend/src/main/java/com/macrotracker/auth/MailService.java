package com.macrotracker.auth;

import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

/**
 * Versendet die Bestätigungs-E-Mail über JavaMailSender (SMTP).
 *
 * Standardmäßig auf Resend konfiguriert (smtp.resend.com), per Umgebungs-
 * variablen aber auf jeden anderen SMTP-Anbieter umstellbar.
 */
@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    private final JavaMailSender mailSender;

    @Value("${app.mail.from}")
    private String from;

    @Value("${app.backend-url}")
    private String backendUrl;

    public MailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
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
            MimeMessage msg = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(msg, false, StandardCharsets.UTF_8.name());
            helper.setFrom(from);
            helper.setTo(to);
            helper.setSubject("Bestätige deine E-Mail · Macro Tracker");
            helper.setText(html, true);
            mailSender.send(msg);
        } catch (Exception e) {
            log.error("Versand der Bestätigungsmail an {} fehlgeschlagen", to, e);
            throw new MailSendFailedException();
        }
    }

    /** Signalisiert, dass der Mailversand fehlschlug (wird als 502 ausgeliefert). */
    public static class MailSendFailedException extends RuntimeException { }
}
