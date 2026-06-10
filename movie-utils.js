function parseGenres(movie) {
  if (Array.isArray(movie.genres)) return movie.genres;
  if (typeof movie.genres === 'string' && movie.genres.trim()) {
    return movie.genres.split(',').map(g => g.trim()).filter(Boolean);
  }
  if (typeof movie.genre_list === 'string' && movie.genre_list.trim()) {
    return movie.genre_list.split(',').map(g => g.trim()).filter(Boolean);
  }
  return [];
}

function movieQualityScore(movie) {
  let score = parseFloat(movie.avg_rating) || 0;
  if (movie.poster_url && movie.poster_url.startsWith('http')) score += 3;
  score += parseGenres(movie).length;
  if (movie.synopsis) score += 1;
  return score;
}

function dedupeMovies(movies) {
  const seen = new Map();
  const result = [];
  for (const movie of movies) {
    const key = `${(movie.title || '').toLowerCase().trim()}|${movie.release_year || ''}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, movie);
      result.push(movie);
    } else if (movieQualityScore(movie) > movieQualityScore(existing)) {
      const idx = result.indexOf(existing);
      if (idx !== -1) result[idx] = movie;
      seen.set(key, movie);
    }
  }
  return result;
}

const DEDUPE_RANK_SQL = `
  ROW_NUMBER() OVER (
    PARTITION BY LOWER(TRIM(m.title)), IFNULL(m.release_year, 0)
    ORDER BY
      (m.poster_url IS NOT NULL AND m.poster_url LIKE 'http%') DESC,
      m.total_ratings DESC,
      m.avg_rating DESC,
      m.movie_id ASC
  ) AS rn
`;

function buildDedupedMoviesQuery({ genreJoin = '', whereClause = '', orderClause = '' }) {
  return `
    SELECT movie_id, title, release_year, duration, language, synopsis,
           poster_url, trailer_url, avg_rating, total_ratings, is_adult, created_at
    FROM (
      SELECT m.*, ${DEDUPE_RANK_SQL}
      FROM Movies m
      ${genreJoin}
      ${whereClause}
    ) ranked
    WHERE rn = 1
    ${orderClause.replace(/\bm\./g, 'ranked.')}
  `;
}

function buildDedupedCountQuery({ genreJoin = '', whereClause = '' }) {
  return `
    SELECT COUNT(*) AS total FROM (
      SELECT 1
      FROM Movies m
      ${genreJoin}
      ${whereClause}
      GROUP BY LOWER(TRIM(m.title)), IFNULL(m.release_year, 0)
    ) deduped
  `;
}

function ensurePoster(movie) {
  if (movie.poster_url && movie.poster_url.startsWith('http')) return movie;
  const title = encodeURIComponent((movie.title || 'Movie').slice(0, 40));
  movie.poster_url = `https://placehold.co/300x450/161a24/e8b86d?text=${title}`;
  return movie;
}

function prepareMovies(movies, { dedupe = true, ensurePosters = true } = {}) {
  let result = movies.map(m => {
    const copy = { ...m, genres: parseGenres(m) };
    if (copy.genre_list) delete copy.genre_list;
    return ensurePosters ? ensurePoster(copy) : copy;
  });
  if (dedupe) result = dedupeMovies(result);
  return result;
}

function buildSearchCondition(search) {
  const term = search.trim();
  const words = term.split(/\s+/).filter(Boolean);

  if (words.length <= 1) {
    const like = `%${term}%`;
    return {
      sql: '(m.title LIKE ? OR m.synopsis LIKE ?)',
      params: [like, like],
      term
    };
  }

  const parts = [];
  const params = [];
  for (const word of words) {
    const like = `%${word}%`;
    parts.push('(m.title LIKE ? OR m.synopsis LIKE ?)');
    params.push(like, like);
  }
  return { sql: `(${parts.join(' AND ')})`, params, term };
}

function normalizeTitle(title) {
  return (title || '').toLowerCase().replace(/^the\s+/, '').trim();
}

function rankSearchResults(movies, term) {
  const q = term.toLowerCase().trim();
  const words = q.split(/\s+/).filter(Boolean);

  return movies
    .map(movie => {
      const title = (movie.title || '').toLowerCase();
      const normalized = normalizeTitle(title);
      let rank = 4;

      if (title === q || normalized === q) rank = 0;
      else if (title.startsWith(q) || normalized.startsWith(q)) rank = 1;
      else if (words.length > 1 && words.every(w => title.includes(w))) rank = 2;
      else if (title.includes(q) || normalized.includes(q)) rank = 3;

      return { movie, rank };
    })
    .sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      const ratingDiff = (parseFloat(b.movie.avg_rating) || 0) - (parseFloat(a.movie.avg_rating) || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (parseInt(b.movie.total_ratings, 10) || 0) - (parseInt(a.movie.total_ratings, 10) || 0);
    })
    .map(entry => entry.movie);
}

async function buildLanguageGroups(query, groups, prepareMoviesFn) {
  const result = [];
  for (const group of groups) {
    const placeholders = group.codes.map(() => '?').join(', ');
    const whereClause = `WHERE m.language IN (${placeholders})`;

    const [countRow] = await query(
      `SELECT COUNT(*) AS count FROM (
         SELECT 1 FROM Movies m ${whereClause}
         GROUP BY LOWER(TRIM(m.title)), IFNULL(m.release_year, 0)
       ) deduped`,
      group.codes
    );
    const count = Number(countRow.count);
    if (!count) continue;

    const movies = await query(
      buildDedupedMoviesQuery({
        whereClause,
        orderClause: 'ORDER BY m.avg_rating DESC, m.total_ratings DESC, m.title ASC LIMIT 5'
      }),
      group.codes
    );

    result.push({
      language: group.browse,
      count,
      movies: prepareMoviesFn(movies, { dedupe: false })
    });
  }
  return result;
}

module.exports = {
  parseGenres,
  dedupeMovies,
  ensurePoster,
  prepareMovies,
  buildSearchCondition,
  rankSearchResults,
  buildLanguageGroups,
  buildDedupedMoviesQuery,
  buildDedupedCountQuery
};
