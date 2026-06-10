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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/movies")
public class MovieController {

  private final MovieService movieService;
  private final AuthSupport authSupport;

  public MovieController(MovieService movieService, AuthSupport authSupport) {
    this.movieService = movieService;
    this.authSupport = authSupport;
  }

  @GetMapping("/trending")
  public List<Map<String, Object>> trending() {
    return movieService.trending(10);
  }

  @GetMapping("/top-rated")
  public List<Map<String, Object>> topRated() {
    return movieService.topRated(20);
  }

  @GetMapping("/languages")
  public List<Map<String, Object>> languages() {
    return movieService.allLanguages();
  }

  @GetMapping("/indian-languages")
  public List<Map<String, Object>> indianLanguages() {
    return movieService.indianLanguages();
  }

  @GetMapping("/international-languages")
  public List<Map<String, Object>> internationalLanguages() {
    return movieService.internationalLanguages();
  }

  @GetMapping
  public Map<String, Object> browse(
      @RequestParam(defaultValue = "1") int page,
      @RequestParam(defaultValue = "20") int limit,
      @RequestParam(defaultValue = "avg_rating") String sort,
      @RequestParam(defaultValue = "desc") String order,
      @RequestParam(required = false) String genre,
      @RequestParam(required = false) String language,
      @RequestParam(required = false) String country,
      @RequestParam(required = false) String year,
      @RequestParam(required = false) String q) {
    return movieService.browseMovies(page, limit, sort, order, genre, language, country, year, q);
  }

  @PostMapping
  public ResponseEntity<Map<String, Object>> addMovie(
      HttpServletRequest request, @RequestBody Map<String, Object> body) {
    authSupport.requireAdmin(request);
    Number movieId = movieService.addMovie(body);
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("message", "Movie added");
    result.put("movie_id", movieId);
    return ResponseEntity.status(HttpStatus.CREATED).body(result);
  }

  @GetMapping("/{id}/similar")
  public List<Map<String, Object>> similar(@PathVariable int id) {
    return movieService.getSimilarMovies(id, 8);
  }

  @GetMapping("/{id}")
  public Map<String, Object> movie(@PathVariable int id) {
    return movieService.getMovie(id);
  }
}
