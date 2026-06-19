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
 * Läuft einmal pro Anfrage vor den Controllern.
 *
 * Sucht den "Authorization: Bearer <token>"-Header, prüft das SUPABASE-JWT und
 * legt bei Erfolg den angemeldeten Benutzer (Principal = Supabase-User-UUID) im
 * Spring-SecurityContext ab. Danach gilt die Anfrage als authentifiziert.
 */
@Component
public class JwtAuthFilter extends OncePerRequestFilter {

    private final SupabaseJwtService jwtService;

    public JwtAuthFilter(SupabaseJwtService jwtService) {
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
                String userId = jwtService.parseUserId(token);   // UUID-String
                var auth = new UsernamePasswordAuthenticationToken(
                        userId, null, AuthorityUtils.NO_AUTHORITIES);
                SecurityContextHolder.getContext().setAuthentication(auth);
            } catch (Exception ignored) {
                // Ungültiges/abgelaufenes Token → bleibt unauthentifiziert (führt zu 401).
            }
        }
        filterChain.doFilter(request, response);
    }
}
