package com.cinematch.web;

import com.cinematch.service.MovieService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/recommendations")
public class RecommendationController {

  private final MovieService movieService;
  private final AuthSupport authSupport;

  public RecommendationController(MovieService movieService, AuthSupport authSupport) {
    this.movieService = movieService;
    this.authSupport = authSupport;
  }

  @PostMapping("/mood")
  public Map<String, Object> mood(HttpServletRequest request, @RequestBody Map<String, Object> body) {
    return movieService.moodRecommendations(authSupport.requireLogin(request).getUserId(), body);
  }

  @GetMapping("/{type}")
  public List<Map<String, Object>> recommend(HttpServletRequest request, @PathVariable String type) {
    if ("content".equals(type) || "collaborative".equals(type)) {
      return movieService.recommendations(type, authSupport.requireLogin(request).getUserId());
    }
    return movieService.recommendations(type, 0);
  }
}
