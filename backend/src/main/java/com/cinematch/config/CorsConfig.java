package com.cinematch.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.List;

@Configuration
public class CorsConfig {

    private static final Logger log = LoggerFactory.getLogger(CorsConfig.class);

    private final AppProperties appProperties;

    public CorsConfig(AppProperties appProperties) {
        this.appProperties = appProperties;
    }

    @Bean
    public CorsFilter corsFilter() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Content-Type", "Authorization"));
        config.setMaxAge(3600L);

        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedOrigins(null);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", new DynamicCorsConfiguration(appProperties, config));
        return new CorsFilter(source);
    }

    /**
     * Mirrors Node isAllowedOrigin logic while keeping credentials support.
     */
    static class DynamicCorsConfiguration extends CorsConfiguration {
        private final AppProperties appProperties;
        private final CorsConfiguration defaults;

        DynamicCorsConfiguration(AppProperties appProperties, CorsConfiguration defaults) {
            this.appProperties = appProperties;
            this.defaults = defaults;
            setAllowCredentials(defaults.getAllowCredentials());
            setAllowedMethods(defaults.getAllowedMethods());
            setAllowedHeaders(defaults.getAllowedHeaders());
            setMaxAge(defaults.getMaxAge());
        }

        @Override
        public String checkOrigin(String requestOrigin) {
            if (requestOrigin == null) {
                return null;
            }
            String origin = AppProperties.normalizeOrigin(requestOrigin);
            if (origin.isEmpty()) {
                return null;
            }
            if (appProperties.getAllowedOrigins().isEmpty()) {
                return origin;
            }
            if (appProperties.isAllowedOrigin(origin)) {
                return origin;
            }
            if (appProperties.isProduction()) {
                log.warn("CORS blocked origin: {}. Allowed: {}", origin,
                        String.join(", ", appProperties.getAllowedOrigins()));
            }
            return null;
        }
    }
}
