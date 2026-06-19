package com.macrotracker.security.oauth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.oauth2.client.CommonOAuth2Provider;
import org.springframework.security.oauth2.client.registration.ClientRegistration;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

/**
 * Baut die OAuth2-Anbieter (Google/GitHub) in Java auf — aber nur die, für die
 * auch Client-ID UND Secret gesetzt sind. So startet die App problemlos, auch
 * wenn (noch) keine Secrets hinterlegt sind: dann ist Social-Login einfach aus.
 *
 * Die Redirect-URI ist "{baseUrl}/login/oauth2/code/{registrationId}" — sie
 * löst sich automatisch auf die öffentliche Backend-URL auf (dafür ist
 * server.forward-headers-strategy=framework gesetzt, siehe application.properties).
 */
@Configuration
public class OAuth2ClientConfig {

    @Value("${GOOGLE_CLIENT_ID:}")   private String googleId;
    @Value("${GOOGLE_CLIENT_SECRET:}") private String googleSecret;
    @Value("${GITHUB_CLIENT_ID:}")   private String githubId;
    @Value("${GITHUB_CLIENT_SECRET:}") private String githubSecret;

    @Bean
    public ClientRegistrationRepository clientRegistrationRepository() {
        List<ClientRegistration> regs = new ArrayList<>();
        if (StringUtils.hasText(googleId) && StringUtils.hasText(googleSecret)) {
            regs.add(CommonOAuth2Provider.GOOGLE.getBuilder("google")
                    .clientId(googleId).clientSecret(googleSecret).build());
        }
        if (StringUtils.hasText(githubId) && StringUtils.hasText(githubSecret)) {
            regs.add(CommonOAuth2Provider.GITHUB.getBuilder("github")
                    .clientId(githubId).clientSecret(githubSecret)
                    .scope("read:user", "user:email")   // user:email → verifizierte Primär-Mail
                    .build());
        }
        if (regs.isEmpty()) {
            // Kein Anbieter konfiguriert → No-op-Repo, Social-Login bleibt deaktiviert.
            return registrationId -> null;
        }
        return new InMemoryClientRegistrationRepository(regs);
    }
}
