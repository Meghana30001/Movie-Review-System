package com.cinematch.web;

import com.cinematch.service.MovieService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/ratings")
public class RatingController {

  private final MovieService movieService;
  private final AuthSupport authSupport;

  public RatingController(MovieService movieService, AuthSupport authSupport) {
    this.movieService = movieService;
    this.authSupport = authSupport;
  }

  @PostMapping
  public ResponseEntity<Map<String, Object>> submit(
      HttpServletRequest request, @RequestBody Map<String, Object> body) {
    int userId = authSupport.requireLogin(request).getUserId();
    Map<String, Object> result = movieService.submitRating(userId, body);
    if ("Rating submitted".equals(result.get("message"))) {
      return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }
    return ResponseEntity.ok(result);
  }
}
