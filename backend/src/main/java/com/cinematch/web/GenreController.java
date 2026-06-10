package com.cinematch.web;

import com.cinematch.service.MovieService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/genres")
public class GenreController {

  private final MovieService movieService;

  public GenreController(MovieService movieService) {
    this.movieService = movieService;
  }

  @GetMapping
  public List<Map<String, Object>> genres() {
    return movieService.genres();
  }

  @GetMapping("/popularity")
  public List<Map<String, Object>> popularity() {
    return movieService.genrePopularity();
  }
}
