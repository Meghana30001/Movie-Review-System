package com.cinematch.web;

import com.cinematch.service.MovieService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
public class HealthController {

  private final MovieService movieService;

  public HealthController(MovieService movieService) {
    this.movieService = movieService;
  }

  @GetMapping({"/", "/api/health"})
  public Map<String, Object> health() {
    return movieService.health();
  }
}
