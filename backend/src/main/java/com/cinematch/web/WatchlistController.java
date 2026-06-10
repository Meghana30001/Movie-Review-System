package com.cinematch.web;

import com.cinematch.service.MovieService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
public class WatchlistController {

  private final MovieService movieService;
  private final AuthSupport authSupport;

  public WatchlistController(MovieService movieService, AuthSupport authSupport) {
    this.movieService = movieService;
    this.authSupport = authSupport;
  }

  @GetMapping("/api/watchlist")
  public List<Map<String, Object>> watchlist(HttpServletRequest request) {
    return movieService.watchlist(authSupport.requireLogin(request).getUserId());
  }

  @PostMapping("/api/watchlist/{id}")
  public ResponseEntity<Map<String, Object>> add(
      HttpServletRequest request, @PathVariable int id) {
    movieService.addWatchlist(authSupport.requireLogin(request).getUserId(), id);
    return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("message", "Added to watchlist"));
  }

  @PostMapping("/api/watch-history/{id}")
  public Map<String, Object> markWatched(
      HttpServletRequest request, @PathVariable int id, @RequestBody(required = false) Map<String, Object> body) {
    Object pct = body == null ? 100 : body.get("completion_pct");
    movieService.markWatched(authSupport.requireLogin(request).getUserId(), id, pct);
    return Map.of("message", "Marked as watched");
  }

  @GetMapping("/api/user/reviews")
  public List<Map<String, Object>> userReviews(HttpServletRequest request) {
    return movieService.userReviews(authSupport.requireLogin(request).getUserId());
  }
}
