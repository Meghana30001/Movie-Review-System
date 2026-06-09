const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 3000;

// Load worldwide movie data
let mockMovies = [];
try {
  const movieData = fs.readFileSync('./world-movies-database.json', 'utf8');
  mockMovies = JSON.parse(movieData);
  console.log(`Loaded ${mockMovies.length} worldwide movies`);
} catch (error) {
  console.log('Error loading world movie data, using fallback:', error.message);
  mockMovies = [
    {
      movie_id: 1,
      title: 'The Shawshank Redemption',
      release_year: 1994,
      avg_rating: 4.8,
      total_ratings: 2500,
      poster_url: 'https://via.placeholder.com/300x450/333/fff?text=Shawshank',
      synopsis: 'Two imprisoned men bond over years, finding redemption.',
      genres: ['Drama'],
      country: 'United States',
      country_code: 'US',
      region: 'North America'
    }
  ];
}

// Extract unique genres from movies
const mockGenres = [];
const genreSet = new Set();
mockMovies.forEach(movie => {
  movie.genres.forEach(genre => {
    if (!genreSet.has(genre)) {
      genreSet.add(genre);
      mockGenres.push({
        genre_id: mockGenres.length + 1,
        genre_name: genre
      });
    }
  });
});

// Extract unique countries and languages
const countries = [...new Set(mockMovies.map(m => m.country).filter(Boolean))];
const languages = [...new Set(mockMovies.map(m => m.language).filter(Boolean))];

const mockUsers = [
  {
    user_id: 1,
    name: 'Megha',
    email: 'megh@gmail.com',
    role: 'user',
    age: 19,
    gender: 'Female',
    location: 'India'
  }
];

let currentUser = null;

// Helper function to parse POST data
function parsePostData(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

// Helper function to send JSON response
function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

// Helper function to get trending movies (high vote count + recent)
function getTrendingMovies() {
  return mockMovies
    .filter(m => m.release_year && m.release_year >= 2020)
    .sort((a, b) => b.total_ratings - a.total_ratings)
    .slice(0, 10);
}

// Helper function to get top rated movies
function getTopRatedMovies() {
  return mockMovies
    .filter(m => m.total_ratings >= 50)
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, 20);
}

// Helper function to get movies by country
function getMoviesByCountry(country) {
  return mockMovies
    .filter(m => m.country === country)
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, 20);
}

// Helper function to get movies by region
function getMoviesByRegion(region) {
  return mockMovies
    .filter(m => m.region === region)
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, 20);
}

// Helper function to get country flag emoji
function getCountryFlag(countryCode) {
  const flags = {
    'US': '🇺🇸', 'IN': '🇮🇳', 'GB': '🇬🇧', 'JP': '🇯🇵',
    'KR': '🇰🇷', 'FR': '🇫🇷', 'DE': '🇩🇪', 'IT': '🇮🇹',
    'ES': '🇪🇸', 'CN': '🇨🇳', 'HK': '🇭🇰', 'RU': '🇷🇺',
    'MX': '🇲🇽', 'BR': '🇧🇷', 'CA': '🇨🇦', 'AU': '🇦🇺',
    'TH': '🇹🇭', 'TR': '🇹🇷', 'SE': '🇸🇪', 'NO': '🇳🇴'
  };
  return flags[countryCode] || '🌍';
}

const server = http.createServer(async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // API Routes
  if (pathname.startsWith('/api/')) {
    // Auth routes
    if (pathname === '/api/auth/me') {
      if (currentUser) {
        sendJson(res, currentUser);
      } else {
        sendJson(res, { error: 'Unauthorized' }, 401);
      }
    }
    else if (pathname === '/api/auth/login') {
      const postData = await parsePostData(req);
      const user = mockUsers.find(u => u.email === postData.email);
      if (user && postData.password) {
        currentUser = user;
        sendJson(res, { 
          message: 'Login successful', 
          user: {
            user_id: user.user_id,
            name: user.name,
            email: user.email,
            role: user.role
          }
        });
      } else {
        sendJson(res, { error: 'Invalid credentials' }, 401);
      }
    }
    else if (pathname === '/api/auth/register') {
      const postData = await parsePostData(req);
      const existingUser = mockUsers.find(u => u.email === postData.email);
      if (existingUser) {
        sendJson(res, { error: 'Email already registered' }, 409);
      } else {
        const newUser = {
          user_id: mockUsers.length + 1,
          name: postData.name,
          email: postData.email,
          role: 'user',
          age: postData.age,
          gender: postData.gender,
          location: postData.location
        };
        mockUsers.push(newUser);
        sendJson(res, { message: 'Registered successfully', user_id: newUser.user_id }, 201);
      }
    }
    else if (pathname === '/api/auth/logout') {
      currentUser = null;
      sendJson(res, { message: 'Logged out' });
    }
    // Movies routes
    else if (pathname === '/api/movies/trending') {
      sendJson(res, getTrendingMovies());
    }
    else if (pathname === '/api/movies/top-rated') {
      sendJson(res, getTopRatedMovies());
    }
    else if (pathname === '/api/movies/countries') {
      const countryStats = {};
      mockMovies.forEach(movie => {
        countryStats[movie.country] = (countryStats[movie.country] || 0) + 1;
      });
      sendJson(res, Object.keys(countryStats).map(country => ({
        country: country,
        count: countryStats[country],
        movies: getMoviesByCountry(country).slice(0, 5)
      })));
    }
    else if (pathname.startsWith('/api/movies/country/')) {
      const country = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByCountry(country));
    }
    else if (pathname.startsWith('/api/movies/region/')) {
      const region = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByRegion(region));
    }
    else if (pathname === '/api/movies') {
      const page = parseInt(parsedUrl.query.page) || 1;
      const limit = parseInt(parsedUrl.query.limit) || 20;
      const genre = parsedUrl.query.genre;
      const language = parsedUrl.query.language;
      const year = parsedUrl.query.year;
      const country = parsedUrl.query.country;
      const region = parsedUrl.query.region;
      const search = parsedUrl.query.q;
      const sort = parsedUrl.query.sort || 'avg_rating';
      
      let filteredMovies = [...mockMovies];
      
      // Apply filters
      if (genre) {
        filteredMovies = filteredMovies.filter(m => m.genres.includes(genre));
      }
      if (language) {
        filteredMovies = filteredMovies.filter(m => m.language === language);
      }
      if (year) {
        filteredMovies = filteredMovies.filter(m => m.release_year === parseInt(year));
      }
      if (country) {
        filteredMovies = filteredMovies.filter(m => m.country === country);
      }
      if (region) {
        filteredMovies = filteredMovies.filter(m => m.region === region);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredMovies = filteredMovies.filter(m => 
          m.title.toLowerCase().includes(searchLower) ||
          m.synopsis.toLowerCase().includes(searchLower) ||
          m.country.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply sorting
      switch(sort) {
        case 'title':
          filteredMovies.sort((a, b) => a.title.localeCompare(b.title));
          break;
        case 'release_year':
          filteredMovies.sort((a, b) => b.release_year - a.release_year);
          break;
        case 'total_ratings':
          filteredMovies.sort((a, b) => b.total_ratings - a.total_ratings);
          break;
        default: // avg_rating
          filteredMovies.sort((a, b) => b.avg_rating - a.avg_rating);
      }
      
      const startIndex = (page - 1) * limit;
      const paginatedMovies = filteredMovies.slice(startIndex, startIndex + limit);
      
      sendJson(res, { 
        movies: paginatedMovies, 
        page: page, 
        limit: limit,
        total: filteredMovies.length
      });
    }
    else if (pathname.startsWith('/api/movies/')) {
      const movieId = parseInt(pathname.split('/')[3]);
      const movie = mockMovies.find(m => m.movie_id === movieId);
      if (movie) {
        sendJson(res, {
          ...movie,
          reviews: [
            {
              rating_id: 1,
              score: 5,
              review_text: `Amazing ${movie.country} cinema! Great international film.`,
              created_at: new Date().toISOString(),
              reviewer: 'Global Movie Lover'
            },
            {
              rating_id: 2,
              score: 4,
              review_text: `Excellent representation of ${movie.country} culture and filmmaking.`,
              created_at: new Date(Date.now() - 86400000).toISOString(),
              reviewer: 'International Cinema Fan'
            }
          ]
        });
      } else {
        sendJson(res, { error: 'Movie not found' }, 404);
      }
    }
    // Genres route
    else if (pathname === '/api/genres') {
      sendJson(res, mockGenres);
    }
    // Countries route (new)
    else if (pathname === '/api/countries') {
      sendJson(res, countries.map(country => ({ country })));
    }
    // Languages route
    else if (pathname === '/api/languages') {
      sendJson(res, languages.map(lang => ({ language })));
    }
    // Regions route
    else if (pathname === '/api/regions') {
      const regions = [...new Set(mockMovies.map(m => m.region).filter(Boolean))];
      sendJson(res, regions.map(region => ({ region })));
    }
    // Recommendations routes
    else if (pathname === '/api/recommendations/content') {
      const userGenres = ['Action', 'Drama', 'Romance'];
      const recommended = mockMovies
        .filter(m => m.genres.some(g => userGenres.includes(g)))
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 10);
      sendJson(res, recommended);
    }
    else if (pathname === '/api/recommendations/collaborative') {
      const recommended = getTopRatedMovies()
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      sendJson(res, recommended);
    }
    else if (pathname === '/api/recommendations/popular') {
      sendJson(res, getTopRatedMovies().slice(0, 10));
    }
    else if (pathname === '/api/recommendations/trending') {
      sendJson(res, getTrendingMovies());
    }
    else if (pathname === '/api/recommendations/international') {
      // International recommendations from different countries
      const diverseMovies = [];
      const selectedCountries = [...new Set(mockMovies.map(m => m.country))].slice(0, 10);
      selectedCountries.forEach(country => {
        const countryMovie = mockMovies.find(m => m.country === country);
        if (countryMovie) diverseMovies.push(countryMovie);
      });
      sendJson(res, diverseMovies);
    }
    // Watchlist routes
    else if (pathname === '/api/watchlist') {
      sendJson(res, []);
    }
    // Watch history routes
    else if (pathname === '/api/watch-history') {
      sendJson(res, []);
    }
    else {
      sendJson(res, { error: 'API endpoint not found' }, 404);
    }
  }
  // Serve static files
  else {
    let filePath = '.' + pathname;
    if (filePath === './') {
      filePath = './index (1).html';
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
      if (error) {
        if (error.code === 'ENOENT') {
          fs.readFile('./index (1).html', (error, content) => {
            if (error) {
              res.writeHead(404, { 'Content-Type': 'text/html' });
              res.end('<h1>404 Not Found</h1>', 'utf-8');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html' });
              res.end(content, 'utf-8');
            }
          });
        } else {
          res.writeHead(500);
          res.end('Server Error: ' + error.code, 'utf-8');
        }
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  }
});

server.listen(port, () => {
  const regionStats = {};
  const countryStats = {};
  
  mockMovies.forEach(movie => {
    regionStats[movie.region] = (regionStats[movie.region] || 0) + 1;
    countryStats[movie.country] = (countryStats[movie.country] || 0) + 1;
  });
  
  console.log(`\n🌍 CineMatch Global Server running at http://localhost:${port}/`);
  console.log(`✅ Total Worldwide Movies: ${mockMovies.length}`);
  console.log(`🌍 Countries Represented: ${Object.keys(countryStats).length}`);
  console.log(`🗺 Regions Covered: ${Object.keys(regionStats).length}`);
  console.log(`🎭 Genres Available: ${mockGenres.length}`);
  console.log(`🌐 Languages: ${languages.length}`);
  console.log(`✅ Real movie poster images from all countries`);
  console.log(`✅ Advanced filtering by country, region, language`);
  console.log(`✅ International recommendations`);
  
  console.log('\n📊 Movies by Region:');
  Object.entries(regionStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([region, count]) => {
      console.log(`   ${region}: ${count} movies`);
    });
  
  console.log('\n🌍 Top 10 Countries by Movie Count:');
  Object.entries(countryStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([country, count]) => {
      const countryCode = mockMovies.find(m => m.country === country)?.country_code || '??';
      const flag = getCountryFlag(countryCode);
      console.log(`   ${flag} ${country}: ${count} movies`);
    });
  
  console.log('\n🎬 Top 10 Movies Worldwide:');
  mockMovies.slice(0, 10).forEach((movie, index) => {
    const flag = getCountryFlag(movie.country_code);
    console.log(`${index + 1}. ${flag} ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5 [${movie.country}]`);
  });
});
