const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 3000;

// Mock data
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

const mockMovies = [
  {
    movie_id: 1,
    title: 'The Shawshank Redemption',
    release_year: 1994,
    avg_rating: 4.8,
    total_ratings: 2500,
    poster_url: 'https://via.placeholder.com/300x450/333/fff?text=Shawshank',
    synopsis: 'Two imprisoned men bond over years, finding redemption.',
    genres: ['Drama']
  },
  {
    movie_id: 2,
    title: 'The Dark Knight',
    release_year: 2008,
    avg_rating: 4.7,
    total_ratings: 3200,
    poster_url: 'https://via.placeholder.com/300x450/333/fff?text=Dark+Knight',
    synopsis: 'Batman faces the Joker in a battle for Gotham.',
    genres: ['Action', 'Crime', 'Drama']
  },
  {
    movie_id: 3,
    title: 'Inception',
    release_year: 2010,
    avg_rating: 4.6,
    total_ratings: 2800,
    poster_url: 'https://via.placeholder.com/300x450/333/fff?text=Inception',
    synopsis: 'A thief who steals corporate secrets through dream-sharing.',
    genres: ['Sci-Fi', 'Thriller']
  },
  {
    movie_id: 4,
    title: 'Pulp Fiction',
    release_year: 1994,
    avg_rating: 4.5,
    total_ratings: 2100,
    poster_url: 'https://via.placeholder.com/300x450/333/fff?text=Pulp+Fiction',
    synopsis: 'Interwoven stories of Los Angeles criminals.',
    genres: ['Crime', 'Drama']
  },
  {
    movie_id: 5,
    title: 'The Matrix',
    release_year: 1999,
    avg_rating: 4.6,
    total_ratings: 2600,
    poster_url: 'https://via.placeholder.com/300x450/333/fff?text=Matrix',
    synopsis: 'A hacker discovers reality is a simulation.',
    genres: ['Sci-Fi', 'Action']
  }
];

const mockGenres = [
  { genre_id: 1, genre_name: 'Action' },
  { genre_id: 2, genre_name: 'Drama' },
  { genre_id: 3, genre_name: 'Comedy' },
  { genre_id: 4, genre_name: 'Sci-Fi' },
  { genre_id: 5, genre_name: 'Thriller' },
  { genre_id: 6, genre_name: 'Crime' }
];

let currentUser = null;
let sessions = {};

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
      sendJson(res, mockMovies.slice(0, 3));
    }
    else if (pathname === '/api/movies/top-rated') {
      sendJson(res, mockMovies.sort((a, b) => b.avg_rating - a.avg_rating));
    }
    else if (pathname === '/api/movies') {
      sendJson(res, { movies: mockMovies, page: 1, limit: 20 });
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
              review_text: 'Amazing movie!',
              created_at: new Date().toISOString(),
              reviewer: 'John Doe'
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
      sendJson(res, mockMovies.slice(0, 4));
    }
    else if (pathname === '/api/recommendations/collaborative') {
      sendJson(res, mockMovies.slice(1, 5));
    }
    else if (pathname === '/api/recommendations/popular') {
      sendJson(res, mockMovies.slice(0, 3));
    }
    else if (pathname === '/api/recommendations/trending') {
      sendJson(res, mockMovies.slice(0, 3));
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
  console.log(`CineMatch Server with Mock API running at http://localhost:${port}/`);
  console.log('✅ Authentication API endpoints available');
  console.log('✅ Movies and recommendations API available');
  console.log('✅ Frontend fully functional');
});
