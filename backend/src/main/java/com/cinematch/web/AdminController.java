package com.cinematch.web;

import com.cinematch.service.MovieService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

  private final MovieService movieService;
  private final AuthSupport authSupport;

  public AdminController(MovieService movieService, AuthSupport authSupport) {
    this.movieService = movieService;
    this.authSupport = authSupport;
  }

  @GetMapping("/stats")
  public Map<String, Object> stats(HttpServletRequest request) {
    authSupport.requireAdmin(request);
    return movieService.adminStats();
  }

  @GetMapping("/reviews")
  public List<Map<String, Object>> reviews(HttpServletRequest request) {
    authSupport.requireAdmin(request);
    return movieService.adminReviews();
  }

  @DeleteMapping("/reviews/{id}")
  public Map<String, Object> deleteReview(HttpServletRequest request, @PathVariable int id) {
    authSupport.requireAdmin(request);
    movieService.deleteReview(id);
    return Map.of("message", "Review removed");
  }
}
