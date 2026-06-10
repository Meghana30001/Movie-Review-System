const http = require('http');
const crypto = require('crypto');
const mysql = require('mysql2/promise');
const url = require('url');
const {
  poolConfig,
  INDIAN_LANGUAGES,
  INDIAN_LANGUAGE_GROUPS,
  INTERNATIONAL_LANGUAGE_GROUPS
} = require('./db-config');
const { hashPassword, verifyPassword } = require('./db-auth');
const { getMoodProfile, scoreMovieForMood } = require('./mood-profiles');
const {
  prepareMovies,
  buildSearchCondition,
  rankSearchResults,
  ensurePoster,
  buildLanguageGroups
} = require('./movie-utils');

const port = parseInt(process.env.PORT || '5000', 10);

function normalizeOrigin(value) {
  const trimmed = (value || '').trim().replace(/\/$/, '');
  if (!trimmed) return '';
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

const ALLOWED_ORIGINS = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(normalizeOrigin)
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === 'production' || !!process.env.RENDER;

const pool = mysql.createPool(poolConfig);
const sessions = new Map();

function isAllowedOrigin(origin) {
  if (!origin) return false;
  if (!ALLOWED_ORIGINS.length) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    if (isProduction && host.endsWith('.vercel.app')) return true;
    return ALLOWED_ORIGINS.some((allowed) => new URL(allowed).hostname === host);
  } catch {
    return false;
  }
}

function setCorsHeaders(req, res) {
  const origin = normalizeOrigin(req.headers.origin);
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (!ALLOWED_ORIGINS.length) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else if (origin && isProduction) {
    console.warn(`CORS blocked origin: ${origin}. Allowed: ${ALLOWED_ORIGINS.join(', ')}`);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

function sessionCookieFlags() {
  if (isProduction && ALLOWED_ORIGINS.length) {
    return 'Path=/; HttpOnly; SameSite=None; Secure';
  }
  return 'Path=/; HttpOnly; SameSite=Lax';
}
let moodMovieCache = null;
let moodCacheTime = 0;

function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  });
  res.end(body);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header.split(';').map(c => c.trim()).filter(Boolean).map(c => {
      const i = c.indexOf('=');
      return i === -1 ? [c, ''] : [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    })
  );
}

function getSession(req) {
  const sid = parseCookies(req).session;
  return sid ? sessions.get(sid) : null;
}

function setSession(res, user) {
  const sid = crypto.randomBytes(24).toString('hex');
  sessions.set(sid, {
    user_id: user.user_id,
    name: user.name,
    role: user.role
  });
  res.setHeader('Set-Cookie', `session=${sid}; ${sessionCookieFlags()}`);
}

function clearSession(req, res) {
  const sid = parseCookies(req).session;
  if (sid) sessions.delete(sid);
  res.setHeader('Set-Cookie', `session=; ${sessionCookieFlags()}; Max-Age=0`);
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { resolve({}); }
    });
  });
}

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

function resolveLanguageCodes(language) {
  if (!language) return [];
  const lang = String(language).trim();
  const allGroups = [...INDIAN_LANGUAGE_GROUPS, ...INTERNATIONAL_LANGUAGE_GROUPS];
  for (const group of allGroups) {
    if (group.browse === lang || group.codes.some((code) => code.toLowerCase() === lang.toLowerCase())) {
      return group.codes;
    }
  }
  return [lang];
}

// Direct queries on Movies table — avoids broken MySQL views on Aiven
const SQL_TOP_RATED = `
  SELECT movie_id, title, release_year, language, avg_rating, total_ratings, poster_url
  FROM Movies
  ORDER BY avg_rating DESC, total_ratings DESC, release_year DESC
  LIMIT ?
`;

const SQL_TRENDING = `
  SELECT movie_id, title, release_year, language, avg_rating, total_ratings, poster_url
  FROM Movies
  ORDER BY total_ratings DESC, avg_rating DESC, release_year DESC
  LIMIT ?
`;

const SQL_GENRE_POPULARITY = `
  SELECT g.genre_name,
         COUNT(DISTINCT mg.movie_id) AS movie_count,
         ROUND(AVG(m.avg_rating), 2) AS avg_genre_rating,
         SUM(m.total_ratings) AS total_votes
  FROM Genres g
  JOIN Movie_Genres mg ON g.genre_id = mg.genre_id
  JOIN Movies m ON mg.movie_id = m.movie_id
  GROUP BY g.genre_name
  ORDER BY total_votes DESC
`;

const SQL_MOVIE_BY_ID = `
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
`;

const SQL_SIMILAR_MOVIES = `
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
`;

async function callProc(name, args = []) {
  const placeholders = args.map(() => '?').join(', ');
  const [rows] = await pool.query(`CALL ${name}(${placeholders})`, args);
  return Array.isArray(rows[0]) ? rows[0] : rows;
}

function requireLogin(req, res) {
  const session = getSession(req);
  if (!session) {
    sendJson(res, { error: 'Unauthorized' }, 401);
    return null;
  }
  return session;
}

function requireAdmin(req, res) {
  const session = requireLogin(req, res);
  if (!session) return null;
  if (session.role !== 'admin') {
    sendJson(res, { error: 'Forbidden' }, 403);
    return null;
  }
  return session;
}

async function attachGenres(movies) {
  for (const m of movies) {
    const genres = await query(
      'SELECT g.genre_name FROM Movie_Genres mg JOIN Genres g ON mg.genre_id = g.genre_id WHERE mg.movie_id = ?',
      [m.movie_id]
    );
    m.genres = genres.map(g => g.genre_name);
  }
  return movies;
}

async function getSimilarMovies(movieId, limit = 8) {
  let rows = [];
  try {
    rows = await callProc('get_because_you_watched', [movieId, limit]);
  } catch {
    rows = await query(SQL_SIMILAR_MOVIES, [movieId, movieId, limit]);
  }
  if (!rows.length) {
    const [movie] = await query('SELECT language FROM Movies WHERE movie_id = ?', [movieId]);
    if (movie?.language) {
      rows = await query(
        `SELECT movie_id, title, release_year, avg_rating, total_ratings, poster_url, language
         FROM Movies WHERE language = ? AND movie_id != ?
         ORDER BY avg_rating DESC, total_ratings DESC LIMIT ?`,
        [movie.language, movieId, limit]
      );
    }
  }
  if (!rows.length) {
    rows = await query(
      `SELECT movie_id, title, release_year, avg_rating, total_ratings, poster_url, language
       FROM Movies WHERE movie_id != ?
       ORDER BY avg_rating DESC, total_ratings DESC LIMIT ?`,
      [movieId, limit]
    );
  }
  return prepareMovies(rows);
}

async function getMoviesForMoodScoring() {
  const now = Date.now();
  if (moodMovieCache && now - moodCacheTime < 5 * 60 * 1000) return moodMovieCache;

  const rows = await query(`
    SELECT m.*, GROUP_CONCAT(DISTINCT g.genre_name ORDER BY g.genre_name SEPARATOR ',') AS genre_list
    FROM Movies m
    LEFT JOIN Movie_Genres mg ON m.movie_id = mg.movie_id
    LEFT JOIN Genres g ON mg.genre_id = g.genre_id
    GROUP BY m.movie_id
  `);

  moodMovieCache = prepareMovies(rows, { dedupe: true, ensurePosters: true });
  moodCacheTime = now;
  return moodMovieCache;
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(req, res);

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  try {
    if (pathname === '/' || pathname === '/api/health') {
      return sendJson(res, { status: 'ok', service: 'CineMatch API', version: '2.1.0' });
    }

    if (pathname === '/api/auth/register' && req.method === 'POST') {
      const d = await parseBody(req);
      if (!d.email || !d.password || !d.name) {
        return sendJson(res, { error: 'Name, email and password required' }, 400);
      }
      const existing = await query('SELECT user_id FROM Users WHERE email = ?', [d.email]);
      if (existing.length) return sendJson(res, { error: 'Email already registered' }, 409);
      const hashed = hashPassword(d.password);
      const [result] = await pool.query(
        'INSERT INTO Users (name, email, password_hash, age, gender, location) VALUES (?, ?, ?, ?, ?, ?)',
        [d.name, d.email, hashed, d.age || null, d.gender || null, d.location || null]
      );
      return sendJson(res, { message: 'Registered successfully', user_id: result.insertId }, 201);
    }

    if (pathname === '/api/auth/login' && req.method === 'POST') {
      const d = await parseBody(req);
      const rows = await query('SELECT * FROM Users WHERE email = ?', [d.email || '']);
      const user = rows[0];
      if (!user || !verifyPassword(d.password || '', user.password_hash)) {
        return sendJson(res, { error: 'Invalid credentials' }, 401);
      }
      await query('UPDATE Users SET last_login = NOW() WHERE user_id = ?', [user.user_id]);
      setSession(res, user);
      return sendJson(res, {
        message: 'Login successful',
        user: { user_id: user.user_id, name: user.name, email: user.email, role: user.role }
      });
    }

    if (pathname === '/api/auth/logout' && req.method === 'POST') {
      clearSession(req, res);
      return sendJson(res, { message: 'Logged out' });
    }

    if (pathname === '/api/auth/me' && req.method === 'GET') {
      const session = requireLogin(req, res);
      if (!session) return;
      const rows = await query(
        'SELECT user_id, name, email, age, gender, location, role, created_at FROM Users WHERE user_id = ?',
        [session.user_id]
      );
      return sendJson(res, rows[0] || {});
    }

    if (pathname === '/api/movies/trending') {
      const movies = prepareMovies(await query(SQL_TRENDING, [10]));
      return sendJson(res, movies);
    }

    if (pathname === '/api/movies/top-rated') {
      const movies = prepareMovies(await query(SQL_TOP_RATED, [20]));
      return sendJson(res, movies);
    }

    if (pathname === '/api/movies/languages') {
      const rows = await query(
        "SELECT language, COUNT(*) AS count FROM Movies WHERE language IS NOT NULL AND language != '' GROUP BY language ORDER BY count DESC"
      );
      const result = [];
      for (const row of rows) {
        const movies = prepareMovies(await query(
          'SELECT movie_id, title, release_year, avg_rating, poster_url, language FROM Movies WHERE language = ? ORDER BY avg_rating DESC LIMIT 5',
          [row.language]
        ));
        result.push({ language: row.language, count: row.count, movies });
      }
      return sendJson(res, result);
    }

    if (pathname === '/api/movies/indian-languages') {
      const result = await buildLanguageGroups(query, INDIAN_LANGUAGE_GROUPS, prepareMovies);
      return sendJson(res, result);
    }

    if (pathname === '/api/movies/international-languages') {
      const result = await buildLanguageGroups(query, INTERNATIONAL_LANGUAGE_GROUPS, prepareMovies);
      return sendJson(res, result);
    }

    if (pathname === '/api/movies' && req.method === 'POST') {
      const session = requireAdmin(req, res);
      if (!session) return;
      const d = await parseBody(req);
      const [result] = await pool.query(
        'INSERT INTO Movies (title, release_year, duration, language, synopsis, poster_url, trailer_url, is_adult) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [d.title, d.release_year || null, d.duration || null, d.language || 'English', d.synopsis || null, d.poster_url || null, d.trailer_url || null, d.is_adult || false]
      );
      return sendJson(res, { message: 'Movie added', movie_id: result.insertId }, 201);
    }

    if (pathname === '/api/movies' && req.method === 'GET') {
      const page = parseInt(parsed.query.page || '1', 10);
      const { genre, language, country, year, q: search } = parsed.query;
      const maxLimit = language && !search ? 200 : 50;
      const limit = Math.min(parseInt(parsed.query.limit || '20', 10), maxLimit);
      const offset = (page - 1) * limit;
      const sort = ['avg_rating', 'total_ratings', 'release_year', 'title'].includes(parsed.query.sort)
        ? parsed.query.sort : 'avg_rating';
      const order = parsed.query.order === 'asc' ? 'ASC' : 'DESC';

      let sql = 'SELECT DISTINCT m.* FROM Movies m ';
      const params = [];
      const conditions = [];

      if (genre) sql += 'JOIN Movie_Genres mg ON m.movie_id = mg.movie_id JOIN Genres g ON mg.genre_id = g.genre_id ';

      let searchTerm = '';
      if (search) {
        const { sql: searchSql, params: searchParams, term } = buildSearchCondition(search);
        searchTerm = term;
        conditions.push(searchSql);
        params.push(...searchParams);
      } else {
        if (genre) { conditions.push('g.genre_name = ?'); params.push(genre); }
        if (language) {
          const codes = resolveLanguageCodes(language);
          conditions.push(`m.language IN (${codes.map(() => '?').join(', ')})`);
          params.push(...codes);
        }
        if (country === 'India') {
          conditions.push(`m.language IN (${INDIAN_LANGUAGES.map(() => '?').join(', ')})`);
          params.push(...INDIAN_LANGUAGES);
        }
        if (year) { conditions.push('m.release_year = ?'); params.push(year); }
      }

      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')} ` : '';
      const orderClause = search
        ? 'ORDER BY m.avg_rating DESC, m.total_ratings DESC, m.title ASC'
        : `ORDER BY m.${sort} ${order}, m.total_ratings DESC, m.title ASC`;

      if (conditions.length) sql += whereClause;
      sql += `${orderClause} LIMIT ? OFFSET ?`;

      const fetchLimit = search ? Math.min(limit * 4, 200) : limit;
      const queryParams = [...params, fetchLimit, search ? 0 : offset];

      let movies = await query(sql, queryParams);
      await attachGenres(movies);
      movies = prepareMovies(movies, { dedupe: !language });
      if (search) {
        movies = rankSearchResults(movies, searchTerm).slice(0, limit);
      }

      let total = movies.length;
      if (!search) {
        let countSql = 'SELECT COUNT(DISTINCT m.movie_id) AS total FROM Movies m ';
        if (genre) countSql += 'JOIN Movie_Genres mg ON m.movie_id = mg.movie_id JOIN Genres g ON mg.genre_id = g.genre_id ';
        countSql += whereClause;
        const [countRow] = await query(countSql, params);
        total = countRow.total;
      }

      return sendJson(res, { movies, page, limit, total, language: language || undefined, q: search || undefined });
    }

    const similarMatch = pathname.match(/^\/api\/movies\/(\d+)\/similar$/);
    if (similarMatch) {
      const movieId = parseInt(similarMatch[1], 10);
      return sendJson(res, await getSimilarMovies(movieId, 8));
    }

    const movieMatch = pathname.match(/^\/api\/movies\/(\d+)$/);
    if (movieMatch && req.method === 'GET') {
      const movieId = parseInt(movieMatch[1], 10);
      const rows = await query(SQL_MOVIE_BY_ID, [movieId]);
      if (!rows.length) return sendJson(res, { error: 'Movie not found' }, 404);
      const movie = rows[0];
      movie.awards = await query('SELECT * FROM Awards WHERE movie_id = ?', [movieId]);
      movie.reviews = await query(
        'SELECT r.rating_id, r.score, r.review_text, r.created_at, u.name AS reviewer FROM Ratings r JOIN Users u ON r.user_id = u.user_id WHERE r.movie_id = ? ORDER BY r.created_at DESC LIMIT 20',
        [movieId]
      );
      ensurePoster(movie);
      return sendJson(res, movie);
    }

    if (pathname === '/api/genres') {
      return sendJson(res, await query('SELECT * FROM Genres ORDER BY genre_name'));
    }

    if (pathname === '/api/genres/popularity') {
      return sendJson(res, await query(SQL_GENRE_POPULARITY));
    }

    if (pathname === '/api/ratings' && req.method === 'POST') {
      const session = requireLogin(req, res);
      if (!session) return;
      const d = await parseBody(req);
      if (!(d.score >= 1 && d.score <= 5)) return sendJson(res, { error: 'Score must be 1–5' }, 400);
      const existing = await query('SELECT rating_id FROM Ratings WHERE user_id = ? AND movie_id = ?', [session.user_id, d.movie_id]);
      if (existing.length) {
        await query('UPDATE Ratings SET score = ?, review_text = ? WHERE rating_id = ?', [d.score, d.review_text || null, existing[0].rating_id]);
        return sendJson(res, { message: 'Rating updated' });
      }
      await query('INSERT INTO Ratings (user_id, movie_id, score, review_text) VALUES (?, ?, ?, ?)', [session.user_id, d.movie_id, d.score, d.review_text || null]);
      return sendJson(res, { message: 'Rating submitted' }, 201);
    }

    if (pathname === '/api/watchlist' && req.method === 'GET') {
      const session = requireLogin(req, res);
      if (!session) return;
      const rows = await query(
        'SELECT m.movie_id, m.title, m.release_year, m.avg_rating, m.poster_url, w.added_on FROM Watchlist w JOIN Movies m ON w.movie_id = m.movie_id WHERE w.user_id = ? ORDER BY w.added_on DESC',
        [session.user_id]
      );
      return sendJson(res, prepareMovies(rows));
    }

    const watchlistMatch = pathname.match(/^\/api\/watchlist\/(\d+)$/);
    if (watchlistMatch && req.method === 'POST') {
      const session = requireLogin(req, res);
      if (!session) return;
      await query('INSERT IGNORE INTO Watchlist (user_id, movie_id) VALUES (?, ?)', [session.user_id, parseInt(watchlistMatch[1], 10)]);
      return sendJson(res, { message: 'Added to watchlist' }, 201);
    }

    const historyMatch = pathname.match(/^\/api\/watch-history\/(\d+)$/);
    if (historyMatch && req.method === 'POST') {
      const session = requireLogin(req, res);
      if (!session) return;
      const d = await parseBody(req);
      const pct = d.completion_pct ?? 100;
      const movieId = parseInt(historyMatch[1], 10);
      await query(
        'INSERT INTO Watch_History (user_id, movie_id, completion_pct) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE watched_on = NOW(), completion_pct = ?',
        [session.user_id, movieId, pct, pct]
      );
      await query('DELETE FROM Watchlist WHERE user_id = ? AND movie_id = ?', [session.user_id, movieId]);
      return sendJson(res, { message: 'Marked as watched' });
    }

    if (pathname === '/api/user/reviews') {
      const session = requireLogin(req, res);
      if (!session) return;
      const rows = await query(
        'SELECT r.rating_id, r.movie_id, r.score, r.review_text, r.created_at, m.title AS movie_title, m.release_year AS movie_year, m.language AS movie_language, m.poster_url AS movie_poster FROM Ratings r JOIN Movies m ON r.movie_id = m.movie_id WHERE r.user_id = ? ORDER BY r.created_at DESC',
        [session.user_id]
      );
      return sendJson(res, rows);
    }

    if (pathname === '/api/recommendations/mood' && req.method === 'POST') {
      const session = requireLogin(req, res);
      if (!session) return;
      const d = await parseBody(req);
      const moodInput = (d.mood || '').toLowerCase().trim();
      const { key: moodKey, profile } = getMoodProfile(moodInput);

      const candidates = await getMoviesForMoodScoring();
      const scored = candidates
        .map(movie => ({ ...movie, mood_score: scoreMovieForMood(movie, profile, moodKey) }))
        .filter(m => m.mood_score > 0)
        .sort((a, b) => b.mood_score - a.mood_score)
        .slice(0, 60)
        .map(({ mood_score, genre_list, ...movie }) => movie);

      return sendJson(res, {
        movies: scored,
        matched_genres: profile.genres,
        mood: moodInput
      });
    }

    const recMatch = pathname.match(/^\/api\/recommendations\/(content|collaborative|popular|trending)$/);
    if (recMatch) {
      const type = recMatch[1];
      if (type === 'content') {
        const session = requireLogin(req, res);
        if (!session) return;
        return sendJson(res, prepareMovies(await callProc('get_content_based_recommendations', [session.user_id, 10])));
      }
      if (type === 'collaborative') {
        const session = requireLogin(req, res);
        if (!session) return;
        return sendJson(res, prepareMovies(await callProc('get_collaborative_recommendations', [session.user_id, 10])));
      }
      if (type === 'popular') {
        return sendJson(res, prepareMovies(await query(SQL_TOP_RATED, [10])));
      }
      if (type === 'trending') {
        return sendJson(res, prepareMovies(await query(SQL_TRENDING, [10])));
      }
    }

    if (pathname === '/api/admin/stats') {
      const session = requireAdmin(req, res);
      if (!session) return;
      const rows = await callProc('get_platform_stats');
      return sendJson(res, rows[0] || {});
    }

    if (pathname === '/api/admin/reviews' && req.method === 'GET') {
      const session = requireAdmin(req, res);
      if (!session) return;
      const rows = await query(
        'SELECT r.rating_id, r.score, r.review_text, r.created_at, u.name AS reviewer, m.title AS movie FROM Ratings r JOIN Users u ON r.user_id = u.user_id JOIN Movies m ON r.movie_id = m.movie_id ORDER BY r.created_at DESC LIMIT 50'
      );
      return sendJson(res, rows);
    }

    const adminReviewMatch = pathname.match(/^\/api\/admin\/reviews\/(\d+)$/);
    if (adminReviewMatch && req.method === 'DELETE') {
      const session = requireAdmin(req, res);
      if (!session) return;
      await query('DELETE FROM Ratings WHERE rating_id = ?', [parseInt(adminReviewMatch[1], 10)]);
      return sendJson(res, { message: 'Review removed' });
    }

    sendJson(res, { error: 'API endpoint not found' }, 404);
  } catch (err) {
    console.error('API error:', err.message);
    sendJson(res, { error: 'Database error', detail: err.message }, 500);
  }
});

async function start() {
  try {
    const [rows] = await pool.query('SELECT COUNT(*) AS count FROM Movies');
    const movieCount = rows[0].count;
    server.listen(port, '0.0.0.0', () => {
      console.log(`\n🗄️  CineMatch API running on port ${port}`);
      console.log(`✅ Connected to database: ${poolConfig.database}`);
      console.log(`🎬 Movies in database: ${movieCount}`);
      if (ALLOWED_ORIGINS.length) {
        console.log(`🌐 Allowed frontend origins: ${ALLOWED_ORIGINS.join(', ')}`);
      }
    });
  } catch (err) {
    console.error('Failed to connect to MySQL:', err.message);
    console.error('Check MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE env vars.');
    process.exit(1);
  }
}

start();
