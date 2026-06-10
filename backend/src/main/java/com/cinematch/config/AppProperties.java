package com.cinematch.config;

import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Component
public class AppProperties {

    private final Environment environment;
    private final List<String> allowedOrigins;
    private final boolean production;

    public AppProperties(Environment environment) {
        this.environment = environment;
        this.allowedOrigins = parseOrigins(environment.getProperty("FRONTEND_URL", ""));
        this.production = isProduction(environment);
    }

    private static boolean isProduction(Environment env) {
        return "production".equalsIgnoreCase(env.getProperty("NODE_ENV"))
                || env.getProperty("RENDER") != null;
    }

    private static List<String> parseOrigins(String raw) {
        if (raw == null || raw.isBlank()) {
            return List.of();
        }
        return Arrays.stream(raw.split(","))
                .map(AppProperties::normalizeOrigin)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toList());
    }

    public static String normalizeOrigin(String value) {
        if (value == null) {
            return "";
        }
        String trimmed = value.trim().replaceAll("/$", "");
        if (trimmed.isEmpty()) {
            return "";
        }
        if (!trimmed.matches("(?i)^https?://.*")) {
            return "https://" + trimmed;
        }
        return trimmed;
    }

    public boolean isProduction() {
        return production;
    }

    public List<String> getAllowedOrigins() {
        return allowedOrigins;
    }

    public boolean isAllowedOrigin(String origin) {
        String normalized = normalizeOrigin(origin);
        if (normalized.isEmpty()) {
            return false;
        }
        if (allowedOrigins.isEmpty()) {
            return true;
        }
        if (allowedOrigins.contains(normalized)) {
            return true;
        }
        try {
            String host = URI.create(normalized).getHost();
            if (production && host != null && host.endsWith(".vercel.app")) {
                return true;
            }
            for (String allowed : allowedOrigins) {
                String allowedHost = URI.create(allowed).getHost();
                if (host != null && host.equals(allowedHost)) {
                    return true;
                }
            }
        } catch (Exception ignored) {
            // invalid origin
        }
        return false;
    }

    public String sessionCookieFlags() {
        if (production && !allowedOrigins.isEmpty()) {
            return "Path=/; HttpOnly; SameSite=None; Secure";
        }
        return "Path=/; HttpOnly; SameSite=Lax";
    }

    public boolean useSecureSessionCookies() {
        return production && !allowedOrigins.isEmpty();
    }
}
