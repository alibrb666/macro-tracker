package com.macrotracker.security.oauth;

import com.macrotracker.auth.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClient;
import org.springframework.security.oauth2.client.OAuth2AuthorizedClientService;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

/**
 * Läuft nach erfolgreichem Google-/GitHub-Login. Ermittelt die (verifizierte)
 * E-Mail, findet oder erstellt das Konto, erzeugt UNSER JWT und leitet zurück
 * in die App: <frontend>/#token=...&email=...  (Fragment, damit der Token nicht
 * in Server-Logs/Referer landet). Bei Fehlern: <frontend>/#oauth_error=1.
 */
@Component
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger log = LoggerFactory.getLogger(OAuth2LoginSuccessHandler.class);

    private final AuthService authService;
    private final OAuth2AuthorizedClientService authorizedClientService;
    private final RestClient rest = RestClient.create();

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public OAuth2LoginSuccessHandler(AuthService authService,
                                     OAuth2AuthorizedClientService authorizedClientService) {
        this.authService = authService;
        this.authorizedClientService = authorizedClientService;
    }

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException {
        try {
            OAuth2AuthenticationToken token = (OAuth2AuthenticationToken) authentication;
            String registrationId = token.getAuthorizedClientRegistrationId();   // "google" | "github"
            OAuth2User user = token.getPrincipal();

            String email = extractEmail(registrationId, user, token);
            if (email == null || email.isBlank()) {
                log.warn("OAuth-Login ohne nutzbare E-Mail (Anbieter {})", registrationId);
                getRedirectStrategy().sendRedirect(request, response, frontendUrl + "#oauth_error=1");
                return;
            }
            String providerId = providerId(registrationId, user);
            String jwt = authService.findOrCreateOAuthAndToken(
                    email, registrationId.toUpperCase(), providerId);

            String target = frontendUrl + "#token=" + enc(jwt) + "&email=" + enc(email);
            getRedirectStrategy().sendRedirect(request, response, target);
        } catch (Exception e) {
            log.error("OAuth-Login fehlgeschlagen", e);
            getRedirectStrategy().sendRedirect(request, response, frontendUrl + "#oauth_error=1");
        }
    }

    private String extractEmail(String registrationId, OAuth2User user, OAuth2AuthenticationToken token) {
        String email = user.getAttribute("email");
        if (email != null && !email.isBlank()) return email;
        // GitHub liefert die E-Mail oft nicht im Profil → über die API nachladen.
        if ("github".equals(registrationId)) return fetchGithubPrimaryEmail(token);
        return null;
    }

    /** Holt die primäre, verifizierte E-Mail über die GitHub-API. */
    @SuppressWarnings("unchecked")
    private String fetchGithubPrimaryEmail(OAuth2AuthenticationToken token) {
        try {
            OAuth2AuthorizedClient client = authorizedClientService.loadAuthorizedClient(
                    token.getAuthorizedClientRegistrationId(), token.getName());
            if (client == null) return null;
            String accessToken = client.getAccessToken().getTokenValue();
            List<Map<String, Object>> emails = rest.get()
                    .uri("https://api.github.com/user/emails")
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Accept", "application/vnd.github+json")
                    .retrieve()
                    .body(List.class);
            if (emails == null) return null;
            String firstVerified = null;
            for (Map<String, Object> e : emails) {
                boolean primary  = Boolean.TRUE.equals(e.get("primary"));
                boolean verified = Boolean.TRUE.equals(e.get("verified"));
                String addr = (String) e.get("email");
                if (verified && firstVerified == null) firstVerified = addr;
                if (primary && verified) return addr;
            }
            return firstVerified;
        } catch (Exception e) {
            log.warn("GitHub-E-Mail konnte nicht geladen werden", e);
            return null;
        }
    }

    private String providerId(String registrationId, OAuth2User user) {
        Object id = "google".equals(registrationId) ? user.getAttribute("sub") : user.getAttribute("id");
        return id != null ? String.valueOf(id) : null;
    }

    private String enc(String s) {
        return URLEncoder.encode(s, StandardCharsets.UTF_8);
    }
}
