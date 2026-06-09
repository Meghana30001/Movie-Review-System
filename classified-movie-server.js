const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = 3000;

// Load enhanced classified movie database
let mockMovies = [];
let classifications = {};
try {
  mockMovies = JSON.parse(fs.readFileSync('./enhanced-classified-movies.json', 'utf8'));
  classifications = JSON.parse(fs.readFileSync('./movie-classifications.json', 'utf8'));
  console.log(`Loaded ${mockMovies.length} enhanced classified movies`);
} catch (error) {
  console.log('Error loading enhanced movie data, using fallback:', error.message);
  // Fallback to original database
  try {
    mockMovies = JSON.parse(fs.readFileSync('./ultimate-movie-database.json', 'utf8'));
    console.log(`Loaded ${mockMovies.length} fallback movies`);
  } catch (fallbackError) {
    mockMovies = [{
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
      region: 'North America',
      language: 'English',
      classification: {
        primaryGenre: 'Drama',
        ratingCategory: 'Excellent',
        movieType: 'Contemporary',
        contentType: 'Teen',
        decade: '1990s',
        popularityLevel: 'Very Popular'
      }
    }];
  }
}

// Extract unique data from enhanced database
const mockGenres = [];
const genreSet = new Set();
const countries = [];
const languages = [];
const regions = [];

mockMovies.forEach(movie => {
  // Genres
  movie.genres.forEach(genre => {
    if (!genreSet.has(genre)) {
      genreSet.add(genre);
      mockGenres.push({
        genre_id: mockGenres.length + 1,
        genre_name: genre
      });
    }
  });
  
  // Countries
  if (!countries.includes(movie.country)) {
    countries.push(movie.country);
  }
  
  // Languages
  if (!languages.includes(movie.language)) {
    languages.push(movie.language);
  }
  
  // Regions
  if (!regions.includes(movie.region)) {
    regions.push(movie.region);
  }
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

// Helper functions
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

function sendJson(res, data, statusCode = 200) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}

function getMoviesByClassification(type, category) {
  if (classifications[type] && classifications[type][category]) {
    const movieIds = classifications[type][category];
    return mockMovies.filter(m => movieIds.includes(m.movie_id))
      .sort((a, b) => b.avg_rating - a.avg_rating);
  }
  return [];
}

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
    // Auth routes (same as before)
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
    else if (pathname === '/api/auth/logout') {
      currentUser = null;
      sendJson(res, { message: 'Logged out' });
    }
    else if (pathname === '/api/auth/register') {
      const postData = await parsePostData(req);
      const existingUser = mockUsers.find(u => u.email === postData.email);
      if (existingUser) {
        sendJson(res, { error: 'Email already exists' }, 400);
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
        sendJson(res, { message: 'Registration successful', user: newUser });
      }
    }
    // Enhanced classification endpoints
    else if (pathname === '/api/classifications/genres') {
      const genreStats = {};
      Object.entries(classifications.genres).forEach(([genre, movieIds]) => {
        genreStats[genre] = {
          count: movieIds.length,
          movies: mockMovies.filter(m => movieIds.includes(m.movie_id)).slice(0, 5)
        };
      });
      sendJson(res, genreStats);
    }
    else if (pathname === '/api/classifications/rating-categories') {
      const ratingStats = {};
      Object.entries(classifications.ratingCategories).forEach(([category, movieIds]) => {
        ratingStats[category] = {
          count: movieIds.length,
          movies: mockMovies.filter(m => movieIds.includes(m.movie_id)).slice(0, 5)
        };
      });
      sendJson(res, ratingStats);
    }
    else if (pathname === '/api/classifications/movie-types') {
      const typeStats = {};
      Object.entries(classifications.movieTypes).forEach(([type, movieIds]) => {
        typeStats[type] = {
          count: movieIds.length,
          movies: mockMovies.filter(m => movieIds.includes(m.movie_id)).slice(0, 5)
        };
      });
      sendJson(res, typeStats);
    }
    else if (pathname === '/api/classifications/decades') {
      const decadeStats = {};
      Object.entries(classifications.decades).forEach(([decade, movieIds]) => {
        decadeStats[decade] = {
          count: movieIds.length,
          movies: mockMovies.filter(m => movieIds.includes(m.movie_id)).slice(0, 5)
        };
      });
      sendJson(res, decadeStats);
    }
    else if (pathname.startsWith('/api/classifications/genre/')) {
      const genre = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByClassification('genres', genre));
    }
    else if (pathname.startsWith('/api/classifications/rating/')) {
      const ratingCategory = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByClassification('ratingCategories', ratingCategory));
    }
    else if (pathname.startsWith('/api/classifications/type/')) {
      const movieType = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByClassification('movieTypes', movieType));
    }
    else if (pathname.startsWith('/api/classifications/decade/')) {
      const decade = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByClassification('decades', decade));
    }
    // Movies routes with enhanced filtering
    else if (pathname === '/api/movies/trending') {
      const trending = mockMovies
        .filter(m => m.release_year && m.release_year >= 2020)
        .sort((a, b) => b.total_ratings - a.total_ratings)
        .slice(0, 10);
      sendJson(res, trending);
    }
    else if (pathname === '/api/movies/top-rated') {
      const topRated = mockMovies
        .filter(m => m.total_ratings >= 50)
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 20);
      sendJson(res, topRated);
    }
    else if (pathname === '/api/movies/classified') {
      // Get movies by classification type and category from query params
      const classificationType = parsedUrl.query.type;
      const category = parsedUrl.query.category;
      
      if (classificationType && category) {
        const movies = getMoviesByClassification(classificationType, category);
        sendJson(res, movies);
      } else {
        // Return all available classifications
        sendJson(res, {
          genres: Object.keys(classifications.genres),
          ratingCategories: Object.keys(classifications.ratingCategories),
          movieTypes: Object.keys(classifications.movieTypes),
          decades: Object.keys(classifications.decades),
          contentTypes: Object.keys(classifications.contentTypes)
        });
      }
    }
    else if (pathname === '/api/movies/indian-languages') {
      // Get Indian languages with movie counts and sample movies
      const indianLanguages = {};
      mockMovies.filter(m => m.country === 'India').forEach(movie => {
        if (!indianLanguages[movie.language]) {
          indianLanguages[movie.language] = {
            language: movie.language,
            count: 0,
            movies: []
          };
        }
        indianLanguages[movie.language].count++;
        if (indianLanguages[movie.language].movies.length < 5) {
          indianLanguages[movie.language].movies.push(movie);
        }
      });
      const result = Object.values(indianLanguages)
        .sort((a, b) => b.count - a.count)
        .map(lang => ({
          language: lang.language,
          count: lang.count,
          movies: lang.movies.sort((a, b) => b.avg_rating - a.avg_rating)
        }));
      sendJson(res, result);
    }
    else if (pathname === '/api/movies/indian') {
      const indianMovies = mockMovies.filter(m => m.country === 'India');
      sendJson(res, indianMovies.sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 20));
    }
    else if (pathname === '/api/movies') {
      const page = parseInt(parsedUrl.query.page) || 1;
      const limit = parseInt(parsedUrl.query.limit) || 20;
      const genre = parsedUrl.query.genre;
      const language = parsedUrl.query.language;
      const year = parsedUrl.query.year;
      const country = parsedUrl.query.country;
      const search = parsedUrl.query.q;
      const sort = parsedUrl.query.sort || 'avg_rating';
      const ratingCategory = parsedUrl.query.ratingCategory;
      const movieType = parsedUrl.query.movieType;
      const decade = parsedUrl.query.decade;
      
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
      if (ratingCategory) {
        filteredMovies = filteredMovies.filter(m => m.classification && m.classification.ratingCategory === ratingCategory);
      }
      if (movieType) {
        filteredMovies = filteredMovies.filter(m => m.classification && m.classification.movieType === movieType);
      }
      if (decade) {
        filteredMovies = filteredMovies.filter(m => m.classification && m.classification.decade === decade);
      }
      if (search) {
        const searchLower = search.toLowerCase();
        filteredMovies = filteredMovies.filter(m => 
          m.title.toLowerCase().includes(searchLower) ||
          m.synopsis.toLowerCase().includes(searchLower) ||
          m.country.toLowerCase().includes(searchLower) ||
          m.language.toLowerCase().includes(searchLower) ||
          (m.classification && m.classification.primaryGenre.toLowerCase().includes(searchLower))
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
        case 'language':
          filteredMovies.sort((a, b) => a.language.localeCompare(b.language));
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
      const pathParts = pathname.split('/');
      const movieId = parseInt(pathParts[3]);
      
      if (pathParts[4] === 'similar') {
        // Similar movies endpoint
        const movie = mockMovies.find(m => m.movie_id === movieId);
        if (movie) {
          const similar = mockMovies
            .filter(m => m.movie_id !== movieId && 
              (m.genres.some(g => movie.genres.includes(g)) || 
               m.country === movie.country ||
               m.language === movie.language))
            .sort((a, b) => b.avg_rating - a.avg_rating)
            .slice(0, 10);
          sendJson(res, similar);
        } else {
          sendJson(res, { error: 'Movie not found' }, 404);
        }
      } else {
        // Regular movie details endpoint
        const movie = mockMovies.find(m => m.movie_id === movieId);
        if (movie) {
          sendJson(res, {
            ...movie,
            reviews: [
              {
                rating_id: 1,
                score: 5,
                review_text: `Excellent ${movie.classification?.primaryGenre || 'film'} with ${movie.classification?.ratingCategory || 'good'} rating!`,
                created_at: new Date().toISOString(),
                reviewer: 'Movie Enthusiast'
              }
            ]
          });
        } else {
          sendJson(res, { error: 'Movie not found' }, 404);
        }
      }
    }
    // Other endpoints (genres, countries, languages, regions, recommendations, watchlist, history)
    else if (pathname === '/api/genres') {
      sendJson(res, mockGenres);
    }
    else if (pathname === '/api/countries') {
      const countryStats = {};
      mockMovies.forEach(movie => {
        countryStats[movie.country] = (countryStats[movie.country] || 0) + 1;
      });
      sendJson(res, Object.keys(countryStats).map(country => ({
        country: country,
        count: countryStats[country],
        movies: mockMovies.filter(m => m.country === country).slice(0, 5)
      })));
    }
    else if (pathname === '/api/languages') {
      const languageStats = {};
      mockMovies.forEach(movie => {
        languageStats[movie.language] = (languageStats[movie.language] || 0) + 1;
      });
      sendJson(res, Object.keys(languageStats).map(language => ({
        language: language,
        count: languageStats[language],
        movies: mockMovies.filter(m => m.language === language).slice(0, 5)
      })));
    }
    else if (pathname === '/api/regions') {
      sendJson(res, regions.map(region => ({ region })));
    }
    else if (pathname === '/api/recommendations/content') {
      const userGenres = ['Action', 'Drama', 'Romance'];
      const recommended = mockMovies
        .filter(m => m.genres.some(g => userGenres.includes(g)))
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 10);
      sendJson(res, recommended);
    }
    else if (pathname === '/api/recommendations/collaborative') {
      const recommended = mockMovies
        .filter(m => m.total_ratings >= 50)
        .sort(() => Math.random() - 0.5)
        .slice(0, 10);
      sendJson(res, recommended);
    }
    else if (pathname === '/api/recommendations/popular') {
      const topRated = mockMovies
        .filter(m => m.total_ratings >= 50)
        .sort((a, b) => b.avg_rating - a.avg_rating)
        .slice(0, 10);
      sendJson(res, topRated);
    }
    else if (pathname === '/api/recommendations/trending') {
      const trending = mockMovies
        .filter(m => m.release_year && m.release_year >= 2020)
        .sort((a, b) => b.total_ratings - a.total_ratings)
        .slice(0, 10);
      sendJson(res, trending);
    }
    else if (pathname === '/api/recommendations/languages') {
      const diverseMovies = [];
      const selectedLanguages = [...new Set(mockMovies.map(m => m.language))].slice(0, 10);
      selectedLanguages.forEach(lang => {
        const langMovie = mockMovies.find(m => m.language === lang);
        if (langMovie) diverseMovies.push(langMovie);
      });
      sendJson(res, diverseMovies);
    }
    else if (pathname === '/api/watchlist') {
      sendJson(res, []);
    }
    else if (pathname === '/api/watch-history') {
      sendJson(res, []);
    }
    else if (pathname === '/api/ratings') {
      const postData = await parsePostData(req);
      if (req.method === 'POST') {
        // Mock rating submission
        sendJson(res, { message: 'Rating submitted successfully', rating: postData });
      } else {
        sendJson(res, { error: 'Method not allowed' }, 405);
      }
    }
    else if (pathname.startsWith('/api/watchlist/')) {
      const movieId = parseInt(pathname.split('/')[3]);
      if (req.method === 'POST') {
        sendJson(res, { message: 'Added to watchlist' });
      } else {
        sendJson(res, { error: 'Method not allowed' }, 405);
      }
    }
    else if (pathname.startsWith('/api/watch-history/')) {
      const movieId = parseInt(pathname.split('/')[3]);
      if (req.method === 'POST') {
        sendJson(res, { message: 'Marked as watched' });
      } else {
        sendJson(res, { error: 'Method not allowed' }, 405);
      }
    }
    // Admin endpoints
    else if (pathname === '/api/admin/stats') {
      const stats = {
        totalMovies: mockMovies.length,
        totalUsers: mockUsers.length,
        totalGenres: mockGenres.length,
        avgRating: (mockMovies.reduce((sum, m) => sum + m.avg_rating, 0) / mockMovies.length).toFixed(2),
        topCountries: countries.slice(0, 5),
        recentMovies: mockMovies.filter(m => m.release_year && m.release_year >= 2020).length
      };
      sendJson(res, stats);
    }
    else if (pathname === '/api/admin/reviews') {
      // Mock reviews data
      const mockReviews = [
        {
          rating_id: 1,
          movie_title: 'Sample Movie 1',
          user_name: 'User 1',
          score: 5,
          review_text: 'Excellent movie!',
          created_at: new Date().toISOString()
        },
        {
          rating_id: 2,
          movie_title: 'Sample Movie 2',
          user_name: 'User 2',
          score: 4,
          review_text: 'Good movie',
          created_at: new Date().toISOString()
        }
      ];
      sendJson(res, mockReviews);
    }
    else if (pathname === '/api/genres/popularity') {
      const genrePopularity = {};
      mockMovies.forEach(movie => {
        movie.genres.forEach(genre => {
          genrePopularity[genre] = (genrePopularity[genre] || 0) + 1;
        });
      });
      const sortedGenres = Object.entries(genrePopularity)
        .map(([name, count]) => ({ genre_name: name, count }))
        .sort((a, b) => b.count - a.count);
      sendJson(res, sortedGenres);
    }
    else if (pathname.startsWith('/api/admin/reviews/')) {
      const reviewId = parseInt(pathname.split('/')[4]);
      if (req.method === 'DELETE') {
        sendJson(res, { message: 'Review deleted successfully' });
      } else {
        sendJson(res, { error: 'Method not allowed' }, 405);
      }
    }
    else if (pathname === '/api/admin/movies') {
      if (req.method === 'POST') {
        const postData = await parsePostData(req);
        const newMovie = {
          movie_id: mockMovies.length + 1,
          ...postData,
          avg_rating: 0,
          total_ratings: 0
        };
        mockMovies.push(newMovie);
        sendJson(res, { message: 'Movie added successfully', movie: newMovie });
      } else {
        sendJson(res, { error: 'Method not allowed' }, 405);
      }
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
  console.log(`\n🎯 CineMatch Classified Server running at http://localhost:${port}/`);
  console.log(`✅ Enhanced Movies: ${mockMovies.length}`);
  console.log(`📊 Classification Categories: ${Object.keys(classifications).length}`);
  console.log(`🎭 Genres: ${Object.keys(classifications.genres || {}).length}`);
  console.log(`⭐ Rating Categories: ${Object.keys(classifications.ratingCategories || {}).length}`);
  console.log(`📅 Movie Types: ${Object.keys(classifications.movieTypes || {}).length}`);
  console.log(`🗣️ Languages: ${languages.length}`);
  console.log(`🌍 Countries: ${countries.length}`);
  console.log(`✅ Advanced classification system active`);
  
  console.log('\n🎬 Classification Examples:');
  console.log('   Top Drama Movies:', getMoviesByClassification('genres', 'Drama').length);
  console.log('   Excellent Movies:', getMoviesByClassification('ratingCategories', 'Excellent').length);
  console.log('   Classic Movies:', getMoviesByClassification('movieTypes', 'Classic').length);
  console.log('   1990s Movies:', getMoviesByClassification('decades', '1990s').length);
});
