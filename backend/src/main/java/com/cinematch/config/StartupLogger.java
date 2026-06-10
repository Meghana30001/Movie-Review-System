package com.cinematch.config;

import com.cinematch.service.MovieService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class StartupLogger {

  private static final Logger log = LoggerFactory.getLogger(StartupLogger.class);

  private final MovieService movieService;
  private final AppProperties appProperties;
  private final Environment environment;

  public StartupLogger(MovieService movieService, AppProperties appProperties, Environment environment) {
    this.movieService = movieService;
    this.appProperties = appProperties;
    this.environment = environment;
  }

  @EventListener(ApplicationReadyEvent.class)
  public void onReady() {
    try {
      log.info("");
      log.info("CineMatch Java API running on port {}", environment.getProperty("server.port", "5000"));
      log.info("Connected to database: {}", environment.getProperty("MYSQL_DATABASE", "movie_rec_db"));
      log.info("Movies in database: {}", movieService.movieCount());
      if (!appProperties.getAllowedOrigins().isEmpty()) {
        log.info("Allowed frontend origins: {}", String.join(", ", appProperties.getAllowedOrigins()));
      }
    } catch (Exception e) {
      log.error("Failed to connect to MySQL: {}", e.getMessage());
      log.error("Check MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE env vars.");
      System.exit(1);
    }
  }
}
