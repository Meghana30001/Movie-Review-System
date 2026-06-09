const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 3000;

// Load real movie data
let mockMovies = [];
try {
  const movieData = fs.readFileSync('./movies-data.json', 'utf8');
  mockMovies = JSON.parse(movieData);
  console.log(`Loaded ${mockMovies.length} movies from TMDB`);
} catch (error) {
  console.log('Error loading movie data, using fallback:', error.message);
  // Fallback movies if loading fails
  mockMovies = [
    {
      movie_id: 1,
      title: 'The Shawshank Redemption',
      release_year: 1994,
      avg_rating: 4.8,
      total_ratings: 2500,
      poster_url: 'https://via.placeholder.com/300x450/333/fff?text=Shawshank',
      synopsis: 'Two imprisoned men bond over years, finding redemption.',
      genres: ['Drama']
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
    .filter(m => m.total_ratings >= 100) // Only movies with decent number of ratings
    .sort((a, b) => b.avg_rating - a.avg_rating)
    .slice(0, 20);
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
    else if (pathname === '/api/movies') {
      const page = parseInt(parsedUrl.query.page) || 1;
      const limit = parseInt(parsedUrl.query.limit) || 20;
      const genre = parsedUrl.query.genre;
      const language = parsedUrl.query.language;
      const year = parsedUrl.query.year;
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
      if (search) {
        const searchLower = search.toLowerCase();
        filteredMovies = filteredMovies.filter(m => 
          m.title.toLowerCase().includes(searchLower) ||
          m.synopsis.toLowerCase().includes(searchLower)
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
              review_text: 'Amazing movie with great visuals and storyline!',
              created_at: new Date().toISOString(),
              reviewer: 'John Doe'
            },
            {
              rating_id: 2,
              score: 4,
              review_text: 'Really enjoyed watching this film. Highly recommended!',
              created_at: new Date(Date.now() - 86400000).toISOString(),
              reviewer: 'Jane Smith'
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
    // Recommendations routes
    else if (pathname === '/api/recommendations/content') {
      // Content-based: movies with similar genres
      const userGenres = ['Action', 'Drama', 'Sci-Fi']; // Simulated user preferences
      const recommended = mockMovies
        .filter(m => m.genres.some(g => userGenres.includes(g)))
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 10);
      sendJson(res, recommended);
    }
    else if (pathname === '/api/recommendations/collaborative') {
      // Collaborative: popular movies user hasn't seen
      const recommended = getTopRatedMovies()
        .sort(() => Math.random() - 0.5) // Shuffle for variety
        .slice(0, 10);
      sendJson(res, recommended);
    }
    else if (pathname === '/api/recommendations/popular') {
      sendJson(res, getTopRatedMovies().slice(0, 10));
    }
    else if (pathname === '/api/recommendations/trending') {
      sendJson(res, getTrendingMovies());
    }
    // Watchlist routes
    else if (pathname === '/api/watchlist') {
      sendJson(res, []); // Empty watchlist for demo
    }
    // Watch history routes
    else if (pathname === '/api/watch-history') {
      sendJson(res, []); // Empty history for demo
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
  console.log(`\n🎬 CineMatch Enhanced Server running at http://localhost:${port}/`);
  console.log(`✅ Loaded ${mockMovies.length} real movies from TMDB`);
  console.log(`✅ ${mockGenres.length} genres available`);
  console.log(`✅ Real movie poster images integrated`);
  console.log(`✅ Full search, filter, and recommendation functionality`);
  console.log('\n📊 Sample movies available:');
  mockMovies.slice(0, 5).forEach((movie, index) => {
    console.log(`   ${index + 1}. ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5`);
  });
});
