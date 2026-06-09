const mysql = require('mysql2/promise');
const https = require('https');
const { poolConfig } = require('./db-config');

const TMDB_API_KEY = process.env.TMDB_API_KEY || '8265bd1679663a7ea12ac168da84d2e8';
const TMDB_IMAGE = 'https://image.tmdb.org/t/p/w500';

const KNOWN_FIXES = {
  'The Godfather|1972': '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
  'The Shawshank Redemption|1994': '/lyQBXzOQSuE59IsHyhrp0qIiPAz.jpg',
  'Inception|2010': '/9gk7adHYeDvHkCSEqAvQNLV5Uge.jpg',
  'The Dark Knight|2008': '/qJ2tW6WMUDux911r6m7haRef0WH.jpg',
  'Interstellar|2014': '/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
  'Forrest Gump|1994': '/saHP97rTPS5eLmrLQEcANmKrsFl.jpg',
  'Parasite|2019': '/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg',
  'Avengers: Endgame|2019': '/or06FN3Dka5tukK1e9sl16pB3iy.jpg',
  'Oppenheimer|2023': '/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
  'Barbie|2023': '/iuFNMS8U5cb6xfzi51Dbkovj7vM.jpg',
  '3 Idiots|2009': '/66A9MqXOyVFCssoloscw79z8Tew.jpg',
  'RRR|2022': '/nEufeZlyAOLqO2brrs0yeF1lgXO.jpg'
};

function fetchJson(targetUrl) {
  return new Promise((resolve, reject) => {
    https.get(targetUrl, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (err) { reject(err); }
      });
    }).on('error', reject);
  });
}

function checkUrl(targetUrl) {
  return new Promise((resolve) => {
    https.get(targetUrl, (res) => resolve(res.statusCode === 200)).on('error', () => resolve(false));
  });
}

async function findPoster(title, year) {
  const key = `${title}|${year || ''}`;
  if (KNOWN_FIXES[key]) return `${TMDB_IMAGE}${KNOWN_FIXES[key]}`;

  const query = encodeURIComponent(title);
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${query}${year ? `&year=${year}` : ''}`;
  const data = await fetchJson(url);
  const match = (data.results || []).find(r => !year || r.release_date?.startsWith(String(year)));
  if (match?.poster_path) return `${TMDB_IMAGE}${match.poster_path}`;
  return null;
}

async function main() {
  const conn = await mysql.createConnection(poolConfig);
  const [movies] = await conn.query('SELECT movie_id, title, release_year, poster_url FROM Movies ORDER BY movie_id');
  let fixed = 0;

  for (const movie of movies) {
    const knownKey = `${movie.title}|${movie.release_year || ''}`;
    if (KNOWN_FIXES[knownKey]) {
      const poster = `${TMDB_IMAGE}${KNOWN_FIXES[knownKey]}`;
      if (movie.poster_url !== poster) {
        await conn.query('UPDATE Movies SET poster_url = ? WHERE movie_id = ?', [poster, movie.movie_id]);
        fixed++;
        console.log(`Fixed (known): ${movie.title} (${movie.release_year})`);
      }
      continue;
    }

    let needsFix = !movie.poster_url || !movie.poster_url.startsWith('http');
    if (!needsFix && movie.poster_url.includes('image.tmdb.org')) {
      needsFix = !(await checkUrl(movie.poster_url));
    }

    if (!needsFix) continue;

    const poster = await findPoster(movie.title, movie.release_year);
    if (poster) {
      await conn.query('UPDATE Movies SET poster_url = ? WHERE movie_id = ?', [poster, movie.movie_id]);
      fixed++;
      console.log(`Fixed: ${movie.title} (${movie.release_year})`);
    }
  }

  console.log(`\nDone. Fixed ${fixed} poster URLs.`);
  await conn.end();
}

main().catch(err => {
  console.error('fix-posters failed:', err.message);
  process.exit(1);
});
