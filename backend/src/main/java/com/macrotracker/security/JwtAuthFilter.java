package com.macrotracker.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Dieser Filter läuft EINMAL pro Anfrage, noch vor den Controllern.
 *
 * Er sucht den "Authorization: Bearer <token>"-Header, prüft das JWT und legt —
 * bei Erfolg — den angemeldeten Benutzer im Spring-SecurityContext ab. Danach
 * "weiß" Spring, dass die Anfrage authentifiziert ist (Principal = User-ID).
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    public JwtAuthFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            try {
                Long userId = jwtService.parseUserId(token);
                // Authentifizierung in den SecurityContext setzen — Principal = User-ID.
                var auth = new UsernamePasswordAuthenticationToken(
                        userId, null, AuthorityUtils.NO_AUTHORITIES);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                // Ungültiges/abgelaufenes Token → bleibt einfach unauthentifiziert (führt zu 401).
            }
        }
        filterChain.doFilter(request, response);
    }
}
