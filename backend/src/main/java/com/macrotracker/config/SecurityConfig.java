package com.macrotracker.config;

import com.macrotracker.security.JwtAuthFilter;
import com.macrotracker.security.oauth.OAuth2LoginSuccessHandler;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.client.registration.ClientRegistrationRepository;
import org.springframework.security.oauth2.client.registration.InMemoryClientRegistrationRepository;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

/**
 * Zentrale Sicherheits-Konfiguration mit ZWEI Filter-Chains:
 *
 *  1) OAuth-Chain (/oauth2/**, /login/oauth2/**): klassisch session-basiert, weil
 *     der OAuth2-Redirect-Tanz kurzzeitig einen Zustand braucht. Nur aktiv, wenn
 *     mindestens ein Anbieter (Google/GitHub) konfiguriert ist.
 *  2) API-Chain (alles andere): stateless, geschützt per JWT — wie gehabt.
 */
@Configuration
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    /** Erlaubte Frontend-Adressen (Komma-getrennt aus Umgebungsvariable). */
    @Value("${app.cors.allowed-origins}")
    private String allowedOrigins;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    // Nur den JWT-Filter im Konstruktor — der OAuth-Success-Handler wird als
    // Methodenparameter injiziert, um einen Bean-Zyklus zu vermeiden
    // (Handler → AuthService → PasswordEncoder, den diese Klasse selbst erzeugt).
    public SecurityConfig(JwtAuthFilter jwtAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
    }

    /** Chain 1 — nur für die OAuth2-Endpunkte (Google/GitHub). */
    @Bean
    @Order(1)
    public SecurityFilterChain oauthFilterChain(HttpSecurity http,
                                                ClientRegistrationRepository repo,
                                                OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler) throws Exception {
        http
            .securityMatcher("/oauth2/**", "/login/oauth2/**")
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());

        // Nur einhängen, wenn echte Anbieter konfiguriert sind (sonst bleibt Social-Login aus).
        if (repo instanceof InMemoryClientRegistrationRepository) {
            http.oauth2Login(o -> o
                .successHandler(oAuth2LoginSuccessHandler)
                .failureHandler((req, res, ex) -> res.sendRedirect(frontendUrl + "#oauth_error=1")));
        }
        return http.build();
    }

    /** Chain 2 — die eigentliche API: stateless, JWT-geschützt. */
    @Bean
    @Order(2)
    public SecurityFilterChain apiFilterChain(HttpSecurity http) throws Exception {
        http
            // CSRF aus: wir nutzen Tokens, keine Cookies/Sessions.
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            // Stateless: der Server merkt sich nichts zwischen Anfragen — alles steckt im JWT.
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/auth/**").permitAll()       // Login/Register/Confirm offen
                .requestMatchers("/", "/health", "/error").permitAll() // Health + Fehlerseite offen
                .anyRequest().authenticated()                      // alles andere braucht Login
            )
            // Unseren JWT-Filter vor dem Standard-Login-Filter einhängen.
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /** Passwort-Hashing mit BCrypt (langsam & gesalzen → sicher gegen Brute-Force). */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration cfg) throws Exception {
        return cfg.getAuthenticationManager();
    }

    /** CORS: erlaubt dem Browser-Frontend (andere Domain) den Zugriff aufs Backend. */
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(
                Arrays.stream(allowedOrigins.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
