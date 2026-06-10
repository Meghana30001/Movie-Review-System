package com.cinematch.util;

import com.cinematch.service.DbService;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.function.BiFunction;

@Component
public class MovieUtils {

    private static final String DEDUPE_RANK_SQL = """
            ROW_NUMBER() OVER (
              PARTITION BY LOWER(TRIM(m.title)), IFNULL(m.release_year, 0)
              ORDER BY
                (m.poster_url IS NOT NULL AND m.poster_url LIKE 'http%%') DESC,
                m.total_ratings DESC,
                m.avg_rating DESC,
                m.movie_id ASC
            ) AS rn
            """;

    public static String buildDedupedMoviesQuery(String genreJoin, String whereClause, String orderClause) {
        String normalizedOrder = orderClause.replace("m.", "ranked.");
        return """
                SELECT movie_id, title, release_year, duration, language, synopsis,
                       poster_url, trailer_url, avg_rating, total_ratings, is_adult, created_at
                FROM (
                  SELECT m.*, %s
                  FROM Movies m
                  %s
                  %s
                ) ranked
                WHERE rn = 1
                %s
                """.formatted(DEDUPE_RANK_SQL, genreJoin, whereClause, normalizedOrder);
    }

    public static String buildDedupedCountQuery(String genreJoin, String whereClause) {
        return """
                SELECT COUNT(*) AS total FROM (
                  SELECT 1
                  FROM Movies m
                  %s
                  %s
                  GROUP BY LOWER(TRIM(m.title)), IFNULL(m.release_year, 0)
                ) deduped
                """.formatted(genreJoin, whereClause);
    }

    public record SearchCondition(String sql, List<Object> params, String term) {}

    public SearchCondition buildSearchCondition(String search) {
        String term = search.trim();
        String[] words = term.split("\\s+");
        List<String> filtered = new ArrayList<>();
        for (String word : words) {
            if (!word.isBlank()) {
                filtered.add(word);
            }
        }

        if (filtered.size() <= 1) {
            String like = "%" + term + "%";
            return new SearchCondition(
                    "(m.title LIKE ? OR m.synopsis LIKE ?)",
                    List.of(like, like),
                    term
            );
        }

        List<String> parts = new ArrayList<>();
        List<Object> params = new ArrayList<>();
        for (String word : filtered) {
            String like = "%" + word + "%";
            parts.add("(m.title LIKE ? OR m.synopsis LIKE ?)");
            params.add(like);
            params.add(like);
        }
        return new SearchCondition("(" + String.join(" AND ", parts) + ")", params, term);
    }

    public List<Map<String, Object>> prepareMovies(List<Map<String, Object>> movies) {
        return prepareMovies(movies, true, true);
    }

    public List<Map<String, Object>> prepareMovies(List<Map<String, Object>> movies, boolean dedupe, boolean ensurePosters) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (Map<String, Object> movie : movies) {
            Map<String, Object> copy = new LinkedHashMap<>(movie);
            copy.put("genres", parseGenres(movie));
            copy.remove("genre_list");
            if (ensurePosters) {
                ensurePoster(copy);
            }
            result.add(copy);
        }
        if (dedupe) {
            return dedupeMovies(result);
        }
        return result;
    }

    public void ensurePoster(Map<String, Object> movie) {
        Object poster = movie.get("poster_url");
        if (poster instanceof String posterUrl && posterUrl.startsWith("http")) {
            return;
        }
        String title = movie.get("title") != null ? movie.get("title").toString() : "Movie";
        if (title.length() > 40) {
            title = title.substring(0, 40);
        }
        movie.put("poster_url", "https://placehold.co/300x450/161a24/e8b86d?text=" + java.net.URLEncoder.encode(title, java.nio.charset.StandardCharsets.UTF_8));
    }

    public List<Map<String, Object>> rankSearchResults(List<Map<String, Object>> movies, String term) {
        String q = term.toLowerCase().trim();
        String[] words = q.split("\\s+");

        List<ScoredMovie> scored = new ArrayList<>();
        for (Map<String, Object> movie : movies) {
            String title = movie.get("title") != null ? movie.get("title").toString().toLowerCase() : "";
            String normalized = normalizeTitle(title);
            int rank = 4;

            if (title.equals(q) || normalized.equals(q)) {
                rank = 0;
            } else if (title.startsWith(q) || normalized.startsWith(q)) {
                rank = 1;
            } else if (words.length > 1 && allWordsPresent(title, words)) {
                rank = 2;
            } else if (title.contains(q) || normalized.contains(q)) {
                rank = 3;
            }

            scored.add(new ScoredMovie(movie, rank));
        }

        scored.sort((a, b) -> {
            if (a.rank != b.rank) {
                return Integer.compare(a.rank, b.rank);
            }
            double ratingDiff = toDouble(b.movie.get("avg_rating")) - toDouble(a.movie.get("avg_rating"));
            if (ratingDiff != 0) {
                return Double.compare(ratingDiff, 0);
            }
            return Integer.compare(toInt(b.movie.get("total_ratings")), toInt(a.movie.get("total_ratings")));
        });

        List<Map<String, Object>> ranked = new ArrayList<>();
        for (ScoredMovie entry : scored) {
            ranked.add(entry.movie);
        }
        return ranked;
    }

    public List<Map<String, Object>> buildLanguageGroups(
            DbService db,
            List<LanguageConfig.LanguageGroup> groups,
            BiFunction<List<Map<String, Object>>, Boolean, List<Map<String, Object>>> prepareFn
    ) {
        List<Map<String, Object>> result = new ArrayList<>();
        for (LanguageConfig.LanguageGroup group : groups) {
            String placeholders = String.join(", ", group.codes().stream().map(c -> "?").toList());
            String whereClause = "WHERE m.language IN (" + placeholders + ")";

            List<Map<String, Object>> countRows = db.query(
                    """
                            SELECT COUNT(*) AS count FROM (
                               SELECT 1 FROM Movies m %s
                               GROUP BY LOWER(TRIM(m.title)), IFNULL(m.release_year, 0)
                             ) deduped
                            """.formatted(whereClause),
                    group.codes().toArray()
            );
            if (countRows.isEmpty()) {
                continue;
            }
            int count = toInt(countRows.get(0).get("count"));
            if (count == 0) {
                continue;
            }

            String sql = buildDedupedMoviesQuery(
                    "",
                    whereClause,
                    "ORDER BY m.avg_rating DESC, m.total_ratings DESC, m.title ASC LIMIT 5"
            );
            List<Map<String, Object>> movies = db.query(sql, group.codes().toArray());

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("language", group.browse());
            entry.put("count", count);
            entry.put("movies", prepareFn.apply(movies, false));
            result.add(entry);
        }
        return result;
    }

    @SuppressWarnings("unchecked")
    private List<String> parseGenres(Map<String, Object> movie) {
        Object genres = movie.get("genres");
        if (genres instanceof List<?> list) {
            List<String> result = new ArrayList<>();
            for (Object item : list) {
                if (item != null) {
                    result.add(item.toString());
                }
            }
            return result;
        }
        if (genres instanceof String genreStr && !genreStr.isBlank()) {
            return splitCommaSeparated(genreStr);
        }
        Object genreList = movie.get("genre_list");
        if (genreList instanceof String genreListStr && !genreListStr.isBlank()) {
            return splitCommaSeparated(genreListStr);
        }
        return List.of();
    }

    private List<String> splitCommaSeparated(String value) {
        List<String> result = new ArrayList<>();
        for (String part : value.split(",")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) {
                result.add(trimmed);
            }
        }
        return result;
    }

    private List<Map<String, Object>> dedupeMovies(List<Map<String, Object>> movies) {
        Map<String, Map<String, Object>> seen = new LinkedHashMap<>();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Map<String, Object> movie : movies) {
            String title = movie.get("title") != null ? movie.get("title").toString().toLowerCase().trim() : "";
            String year = movie.get("release_year") != null ? movie.get("release_year").toString() : "";
            String key = title + "|" + year;

            Map<String, Object> existing = seen.get(key);
            if (existing == null) {
                seen.put(key, movie);
                result.add(movie);
            } else if (movieQualityScore(movie) > movieQualityScore(existing)) {
                int idx = result.indexOf(existing);
                if (idx != -1) {
                    result.set(idx, movie);
                }
                seen.put(key, movie);
            }
        }
        return result;
    }

    private double movieQualityScore(Map<String, Object> movie) {
        double score = toDouble(movie.get("avg_rating"));
        Object poster = movie.get("poster_url");
        if (poster instanceof String posterUrl && posterUrl.startsWith("http")) {
            score += 3;
        }
        score += parseGenres(movie).size();
        if (movie.get("synopsis") != null) {
            score += 1;
        }
        return score;
    }

    private static String normalizeTitle(String title) {
        return title.replaceFirst("^the\\s+", "").trim();
    }

    private static boolean allWordsPresent(String title, String[] words) {
        for (String word : words) {
            if (word.isBlank() || !title.contains(word)) {
                return false;
            }
        }
        return true;
    }

    private static double toDouble(Object value) {
        if (value instanceof Number number) {
            return number.doubleValue();
        }
        if (value == null) {
            return 0;
        }
        try {
            return Double.parseDouble(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private static int toInt(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value == null) {
            return 0;
        }
        try {
            return Integer.parseInt(value.toString());
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private record ScoredMovie(Map<String, Object> movie, int rank) {}
}
