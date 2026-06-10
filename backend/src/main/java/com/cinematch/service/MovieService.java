package com.cinematch.service;

import com.cinematch.util.LanguageConfig;
import com.cinematch.util.MoodProfiles;
import com.cinematch.util.MovieUtils;
import com.cinematch.web.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MovieService {

  private static final String SQL_GENRE_POPULARITY = """
      SELECT g.genre_name,
             COUNT(DISTINCT mg.movie_id) AS movie_count,
             ROUND(AVG(m.avg_rating), 2) AS avg_genre_rating,
             SUM(m.total_ratings) AS total_votes
      FROM Genres g
      JOIN Movie_Genres mg ON g.genre_id = mg.genre_id
      JOIN Movies m ON mg.movie_id = m.movie_id
      GROUP BY g.genre_name
      ORDER BY total_votes DESC
      """;

  private static final String SQL_MOVIE_BY_ID = """
      SELECT m.*,
        (SELECT GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ')
         FROM Movie_Genres mg
         JOIN Genres g ON mg.genre_id = g.genre_id
         WHERE mg.movie_id = m.movie_id) AS genres,
        (SELECT GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ')
         FROM Movie_Cast mc
         JOIN People p ON mc.person_id = p.person_id
         WHERE mc.movie_id = m.movie_id AND mc.role_type = 'Director') AS directors,
        (SELECT GROUP_CONCAT(DISTINCT p.name ORDER BY p.name SEPARATOR ', ')
         FROM Movie_Cast mc
         JOIN People p ON mc.person_id = p.person_id
         WHERE mc.movie_id = m.movie_id AND mc.role_type = 'Actor') AS cast_members
      FROM Movies m
      WHERE m.movie_id = ?
      """;

  private static final String SQL_SIMILAR_MOVIES = """
      SELECT DISTINCT m.movie_id, m.title, m.release_year, m.avg_rating,
             m.total_ratings, m.poster_url,
             (SELECT GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ', ')
              FROM Movie_Genres mg2
              JOIN Genres g ON mg2.genre_id = g.genre_id
              WHERE mg2.movie_id = m.movie_id) AS genres
      FROM Movies m
      JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
      WHERE mg.genre_id IN (
        SELECT genre_id FROM Movie_Genres WHERE movie_id = ?
      )
      AND m.movie_id != ?
      ORDER BY m.avg_rating DESC
      LIMIT ?
      """;

  private final DbService db;
  private final MovieUtils movieUtils;
  private final LanguageConfig languageConfig;

  private List<Map<String, Object>> moodMovieCache;
  private long moodCacheTime;

  public MovieService(DbService db, MovieUtils movieUtils, LanguageConfig languageConfig) {
    this.db = db;
    this.movieUtils = movieUtils;
    this.languageConfig = languageConfig;
  }

  public Map<String, Object> health() {
    Map<String, Object> body = new LinkedHashMap<>();
    body.put("status", "ok");
    body.put("service", "CineMatch API");
    body.put("version", "3.0.0-java");
    return body;
  }

  public List<Map<String, Object>> trending(int limit) {
    String sql = MovieUtils.buildDedupedMoviesQuery(
        "", "",
        "ORDER BY m.total_ratings DESC, m.avg_rating DESC, m.release_year DESC LIMIT ?");
    return movieUtils.prepareMovies(db.query(sql, limit));
  }

  public List<Map<String, Object>> topRated(int limit) {
    String sql = MovieUtils.buildDedupedMoviesQuery(
        "", "",
        "ORDER BY m.avg_rating DESC, m.total_ratings DESC, m.release_year DESC LIMIT ?");
    return movieUtils.prepareMovies(db.query(sql, limit));
  }

  public List<Map<String, Object>> allLanguages() {
    List<Map<String, Object>> rows = db.query(
        "SELECT language, COUNT(*) AS count FROM Movies WHERE language IS NOT NULL AND language != '' GROUP BY language ORDER BY count DESC");
    List<Map<String, Object>> result = new ArrayList<>();
    for (Map<String, Object> row : rows) {
      String language = String.valueOf(row.get("language"));
      String whereClause = "WHERE m.language = ?";
      Map<String, Object> countRow = db.queryOne(
          "SELECT COUNT(*) AS count FROM (SELECT 1 FROM Movies m " + whereClause
              + " GROUP BY LOWER(TRIM(m.title)), IFNULL(m.release_year, 0)) deduped",
          language);
      String sql = MovieUtils.buildDedupedMoviesQuery(
          "", whereClause, "ORDER BY m.avg_rating DESC, m.total_ratings DESC, m.title ASC LIMIT 5");
      List<Map<String, Object>> movies = movieUtils.prepareMovies(db.query(sql, language), false, true);
      Map<String, Object> entry = new LinkedHashMap<>();
      entry.put("language", language);
      entry.put("count", countRow != null ? countRow.get("count") : 0);
      entry.put("movies", movies);
      result.add(entry);
    }
    return result;
  }

  public List<Map<String, Object>> indianLanguages() {
    return movieUtils.buildLanguageGroups(db, LanguageConfig.INDIAN_LANGUAGE_GROUPS,
        (movies, dedupe) -> movieUtils.prepareMovies(movies, dedupe, true));
  }

  public List<Map<String, Object>> internationalLanguages() {
    return movieUtils.buildLanguageGroups(db, LanguageConfig.INTERNATIONAL_LANGUAGE_GROUPS,
        (movies, dedupe) -> movieUtils.prepareMovies(movies, dedupe, true));
  }

  public Map<String, Object> browseMovies(int page, int limit, String sort, String order,
      String genre, String language, String country, String year, String search) {
    int maxLimit = (language != null && !language.isBlank() && (search == null || search.isBlank())) ? 200 : 50;
    limit = Math.min(limit, maxLimit);
    int offset = (page - 1) * limit;
    if (!List.of("avg_rating", "total_ratings", "release_year", "title").contains(sort)) {
      sort = "avg_rating";
    }
    String orderDir = "asc".equalsIgnoreCase(order) ? "ASC" : "DESC";

    List<Object> params = new ArrayList<>();
    List<String> conditions = new ArrayList<>();
    String searchTerm = "";

    if (search != null && !search.isBlank()) {
      MovieUtils.SearchCondition sc = movieUtils.buildSearchCondition(search);
      searchTerm = sc.term();
      conditions.add(sc.sql());
      params.addAll(sc.params());
    } else {
      if (genre != null && !genre.isBlank()) {
        conditions.add("g.genre_name = ?");
        params.add(genre);
      }
      if (language != null && !language.isBlank()) {
        List<String> codes = languageConfig.resolveLanguageCodes(language);
        conditions.add("m.language IN (" + String.join(", ", codes.stream().map(c -> "?").toList()) + ")");
        params.addAll(codes);
      }
      if ("India".equals(country)) {
        conditions.add("m.language IN (" + String.join(", ",
            LanguageConfig.INDIAN_LANGUAGES.stream().map(c -> "?").toList()) + ")");
        params.addAll(LanguageConfig.INDIAN_LANGUAGES);
      }
      if (year != null && !year.isBlank()) {
        conditions.add("m.release_year = ?");
        params.add(year);
      }
    }

    String genreJoin = (genre != null && !genre.isBlank())
        ? "JOIN Movie_Genres mg ON m.movie_id = mg.movie_id JOIN Genres g ON mg.genre_id = g.genre_id "
        : "";

    String whereClause = conditions.isEmpty() ? "" : "WHERE " + String.join(" AND ", conditions) + " ";
    String orderClause = (search != null && !search.isBlank())
        ? "ORDER BY m.avg_rating DESC, m.total_ratings DESC, m.title ASC"
        : "ORDER BY m." + sort + " " + orderDir + ", m.total_ratings DESC, m.title ASC";

    List<Map<String, Object>> movies;
    if (search != null && !search.isBlank()) {
      int fetchLimit = Math.min(limit * 4, 200);
      String sql = "SELECT DISTINCT m.* FROM Movies m " + genreJoin + whereClause + orderClause + " LIMIT ? OFFSET ?";
      List<Object> queryParams = new ArrayList<>(params);
      queryParams.add(fetchLimit);
      queryParams.add(0);
      movies = db.query(sql, queryParams.toArray());
    } else {
      String sql = MovieUtils.buildDedupedMoviesQuery(genreJoin, whereClause, orderClause) + " LIMIT ? OFFSET ?";
      List<Object> queryParams = new ArrayList<>(params);
      queryParams.add(limit);
      queryParams.add(offset);
      movies = db.query(sql, queryParams.toArray());
    }

    attachGenres(movies);
    movies = movieUtils.prepareMovies(movies);
    if (search != null && !search.isBlank()) {
      movies = movieUtils.rankSearchResults(movies, searchTerm);
      if (movies.size() > limit) {
        movies = movies.subList(0, limit);
      }
    }

    int total = movies.size();
    if (search == null || search.isBlank()) {
      Map<String, Object> countRow = db.queryOne(
          MovieUtils.buildDedupedCountQuery(genreJoin, whereClause), params.toArray());
      if (countRow != null) {
        total = ((Number) countRow.get("total")).intValue();
      }
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("movies", movies);
    result.put("page", page);
    result.put("limit", limit);
    result.put("total", total);
    if (language != null && !language.isBlank()) {
      result.put("language", language);
    }
    if (search != null && !search.isBlank()) {
      result.put("q", search);
    }
    return result;
  }

  public Map<String, Object> getMovie(int movieId) {
    Map<String, Object> movie = db.queryOne(SQL_MOVIE_BY_ID, movieId);
    if (movie == null) {
      throw new ApiException("Movie not found", HttpStatus.NOT_FOUND);
    }
    movie.put("awards", db.query("SELECT * FROM Awards WHERE movie_id = ?", movieId));
    movie.put("reviews", db.query(
        """
            SELECT r.rating_id, r.score, r.review_text, r.created_at, u.name AS reviewer
            FROM Ratings r JOIN Users u ON r.user_id = u.user_id
            WHERE r.movie_id = ? ORDER BY r.created_at DESC LIMIT 20
            """,
        movieId));
    movieUtils.ensurePoster(movie);
    return movie;
  }

  public List<Map<String, Object>> getSimilarMovies(int movieId, int limit) {
    List<Map<String, Object>> rows;
    try {
      rows = db.callProc("get_because_you_watched", movieId, limit);
    } catch (Exception e) {
      rows = db.query(SQL_SIMILAR_MOVIES, movieId, movieId, limit);
    }
    if (rows.isEmpty()) {
      Map<String, Object> movie = db.queryOne("SELECT language FROM Movies WHERE movie_id = ?", movieId);
      if (movie != null && movie.get("language") != null) {
        rows = db.query(
            """
                SELECT movie_id, title, release_year, avg_rating, total_ratings, poster_url, language
                FROM Movies WHERE language = ? AND movie_id != ?
                ORDER BY avg_rating DESC, total_ratings DESC LIMIT ?
                """,
            movie.get("language"), movieId, limit);
      }
    }
    if (rows.isEmpty()) {
      rows = db.query(
          """
              SELECT movie_id, title, release_year, avg_rating, total_ratings, poster_url, language
              FROM Movies WHERE movie_id != ?
              ORDER BY avg_rating DESC, total_ratings DESC LIMIT ?
              """,
          movieId, limit);
    }
    return movieUtils.prepareMovies(rows);
  }

  public Number addMovie(Map<String, Object> body) {
    return db.insert(
        "INSERT INTO Movies (title, release_year, duration, language, synopsis, poster_url, trailer_url, is_adult) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        body.get("title"),
        body.get("release_year"),
        body.get("duration"),
        body.getOrDefault("language", "English"),
        body.get("synopsis"),
        body.get("poster_url"),
        body.get("trailer_url"),
        body.getOrDefault("is_adult", false));
  }

  public List<Map<String, Object>> genres() {
    return db.query("SELECT * FROM Genres ORDER BY genre_name");
  }

  public List<Map<String, Object>> genrePopularity() {
    return db.query(SQL_GENRE_POPULARITY);
  }

  public Map<String, Object> submitRating(int userId, Map<String, Object> body) {
    int score = toInt(body.get("score"));
    if (score < 1 || score > 5) {
      throw new ApiException("Score must be 1-5", HttpStatus.BAD_REQUEST);
    }
    int movieId = toInt(body.get("movie_id"));
    List<Map<String, Object>> existing = db.query(
        "SELECT rating_id FROM Ratings WHERE user_id = ? AND movie_id = ?", userId, movieId);
    if (!existing.isEmpty()) {
      db.update("UPDATE Ratings SET score = ?, review_text = ? WHERE rating_id = ?",
          score, body.get("review_text"), existing.get(0).get("rating_id"));
      return Map.of("message", "Rating updated");
    }
    db.update("INSERT INTO Ratings (user_id, movie_id, score, review_text) VALUES (?, ?, ?, ?)",
        userId, movieId, score, body.get("review_text"));
    Map<String, Object> result = new LinkedHashMap<>();
    result.put("message", "Rating submitted");
    return result;
  }

  public List<Map<String, Object>> watchlist(int userId) {
    List<Map<String, Object>> rows = db.query(
        """
            SELECT m.movie_id, m.title, m.release_year, m.avg_rating, m.poster_url, w.added_on
            FROM Watchlist w JOIN Movies m ON w.movie_id = m.movie_id
            WHERE w.user_id = ? ORDER BY w.added_on DESC
            """,
        userId);
    return movieUtils.prepareMovies(rows);
  }

  public void addWatchlist(int userId, int movieId) {
    db.update("INSERT IGNORE INTO Watchlist (user_id, movie_id) VALUES (?, ?)", userId, movieId);
  }

  public void markWatched(int userId, int movieId, Object completionPct) {
    int pct = completionPct == null ? 100 : toInt(completionPct);
    db.update(
        """
            INSERT INTO Watch_History (user_id, movie_id, completion_pct) VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE watched_on = NOW(), completion_pct = ?
            """,
        userId, movieId, pct, pct);
    db.update("DELETE FROM Watchlist WHERE user_id = ? AND movie_id = ?", userId, movieId);
  }

  public List<Map<String, Object>> userReviews(int userId) {
    return db.query(
        """
            SELECT r.rating_id, r.movie_id, r.score, r.review_text, r.created_at,
                   m.title AS movie_title, m.release_year AS movie_year,
                   m.language AS movie_language, m.poster_url AS movie_poster
            FROM Ratings r JOIN Movies m ON r.movie_id = m.movie_id
            WHERE r.user_id = ? ORDER BY r.created_at DESC
            """,
        userId);
  }

  public Map<String, Object> moodRecommendations(int userId, Map<String, Object> body) {
    String moodInput = String.valueOf(body.getOrDefault("mood", "")).toLowerCase().trim();
    MoodProfiles.MoodMatch match = MoodProfiles.getMoodProfile(moodInput);
    List<Map<String, Object>> candidates = getMoviesForMoodScoring();

    List<Map<String, Object>> scored = new ArrayList<>();
    for (Map<String, Object> movie : candidates) {
      double moodScore = MoodProfiles.scoreMovieForMood(movie, match.profile(), match.key());
      if (moodScore > 0) {
        Map<String, Object> copy = new LinkedHashMap<>(movie);
        copy.remove("genre_list");
        scored.add(copy);
        copy.put("mood_score", moodScore);
      }
    }
    scored.sort(Comparator.comparingDouble(m -> -toDouble(m.get("mood_score"))));
    if (scored.size() > 60) {
      scored = scored.subList(0, 60);
    }
    for (Map<String, Object> movie : scored) {
      movie.remove("mood_score");
    }

    Map<String, Object> result = new LinkedHashMap<>();
    result.put("movies", scored);
    result.put("matched_genres", match.profile().genres());
    result.put("mood", moodInput);
    return result;
  }

  public List<Map<String, Object>> recommendations(String type, int userId) {
    return switch (type) {
      case "content" -> movieUtils.prepareMovies(db.callProc("get_content_based_recommendations", userId, 10));
      case "collaborative" -> movieUtils.prepareMovies(db.callProc("get_collaborative_recommendations", userId, 10));
      case "popular" -> topRated(10);
      case "trending" -> trending(10);
      default -> throw new ApiException("API endpoint not found", HttpStatus.NOT_FOUND);
    };
  }

  public Map<String, Object> adminStats() {
    List<Map<String, Object>> rows = db.callProc("get_platform_stats");
    return rows.isEmpty() ? Map.of() : rows.get(0);
  }

  public List<Map<String, Object>> adminReviews() {
    return db.query(
        """
            SELECT r.rating_id, r.score, r.review_text, r.created_at, u.name AS reviewer, m.title AS movie
            FROM Ratings r
            JOIN Users u ON r.user_id = u.user_id
            JOIN Movies m ON r.movie_id = m.movie_id
            ORDER BY r.created_at DESC LIMIT 50
            """);
  }

  public void deleteReview(int ratingId) {
    db.update("DELETE FROM Ratings WHERE rating_id = ?", ratingId);
  }

  public int movieCount() {
    Map<String, Object> row = db.queryOne("SELECT COUNT(*) AS count FROM Movies");
    return row == null ? 0 : ((Number) row.get("count")).intValue();
  }

  private void attachGenres(List<Map<String, Object>> movies) {
    for (Map<String, Object> movie : movies) {
      List<Map<String, Object>> genres = db.query(
          "SELECT g.genre_name FROM Movie_Genres mg JOIN Genres g ON mg.genre_id = g.genre_id WHERE mg.movie_id = ?",
          movie.get("movie_id"));
      List<String> names = new ArrayList<>();
      for (Map<String, Object> g : genres) {
        names.add(String.valueOf(g.get("genre_name")));
      }
      movie.put("genres", names);
    }
  }

  private List<Map<String, Object>> getMoviesForMoodScoring() {
    long now = System.currentTimeMillis();
    if (moodMovieCache != null && now - moodCacheTime < 5 * 60 * 1000) {
      return moodMovieCache;
    }
    List<Map<String, Object>> rows = db.query(
        """
            SELECT m.*, GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ',') AS genre_list
            FROM Movies m
            LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
            LEFT JOIN Genres g ON mg.genre_id = g.genre_id
            GROUP BY m.movie_id
            """);
    moodMovieCache = movieUtils.prepareMovies(rows);
    moodCacheTime = now;
    return moodMovieCache;
  }

  private static int toInt(Object value) {
    if (value instanceof Number n) {
      return n.intValue();
    }
    return Integer.parseInt(String.valueOf(value));
  }

  private static double toDouble(Object value) {
    if (value instanceof Number n) {
      return n.doubleValue();
    }
    try {
      return Double.parseDouble(String.valueOf(value));
    } catch (NumberFormatException e) {
      return 0;
    }
  }
}
