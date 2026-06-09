const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const port = parseInt(process.env.PORT || '3000', 10);
const apiOnly = process.env.API_ONLY === '1';

// Load ultimate movie database (worldwide + all Indian languages)
let mockMovies = [];
try {
  const movieData = fs.readFileSync('./ultimate-movie-database.json', 'utf8');
  mockMovies = JSON.parse(movieData);
  console.log(`Loaded ${mockMovies.length} ultimate movies (worldwide + all Indian languages)`);
} catch (error) {
  console.log('Error loading ultimate movie data, using fallback:', error.message);
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
      region: 'North America',
      language: 'English'
    }
  ];
}

// Extract unique genres, countries, languages, and regions
const mockGenres = [];
const genreSet = new Set();
const countries = [];
const languages = [];
const regions = [];
const indianLanguages = [];
const indianRegions = [];

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
  
  // Indian specific
  if (movie.country === 'India') {
    if (!indianLanguages.includes(movie.language)) {
      indianLanguages.push(movie.language);
    }
    if (!indianRegions.includes(movie.region)) {
      indianRegions.push(movie.region);
    }
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
  },
  {
    user_id: 2,
    name: 'Admin User',
    email: 'admin@movierec.com',
    role: 'admin',
    age: 30,
    gender: 'Other',
    location: 'Mumbai'
  }
];

let currentUser = null;
let userWatchlist = [];
let userRatings = [];

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

// Helper function to get trending movies
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

// Helper function to get movies by language
function getMoviesByLanguage(language) {
  return mockMovies
    .filter(m => m.language === language)
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

// Helper function to get Indian movies by language
function getIndianMoviesByLanguage(language) {
  return mockMovies
    .filter(m => m.country === 'India' && m.language === language)
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
    // Movies routes with language-based sorting
    else if (pathname === '/api/movies/trending') {
      sendJson(res, getTrendingMovies());
    }
    else if (pathname === '/api/movies/top-rated') {
      sendJson(res, getTopRatedMovies());
    }
    else if (pathname === '/api/movies/languages') {
      const languageStats = {};
      mockMovies.forEach(movie => {
        languageStats[movie.language] = (languageStats[movie.language] || 0) + 1;
      });
      sendJson(res, Object.keys(languageStats).map(language => ({
        language: language,
        count: languageStats[language],
        movies: getMoviesByLanguage(language).slice(0, 5)
      })));
    }
    else if (pathname === '/api/movies/indian-languages') {
      const indianLanguageStats = {};
      mockMovies.filter(m => m.country === 'India').forEach(movie => {
        indianLanguageStats[movie.language] = (indianLanguageStats[movie.language] || 0) + 1;
      });
      sendJson(res, Object.keys(indianLanguageStats).map(language => ({
        language: language,
        count: indianLanguageStats[language],
        movies: getIndianMoviesByLanguage(language).slice(0, 5)
      })));
    }
    else if (pathname.startsWith('/api/movies/language/')) {
      const language = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByLanguage(language));
    }
    else if (pathname.startsWith('/api/movies/indian-language/')) {
      const language = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getIndianMoviesByLanguage(language));
    }
    else if (pathname.startsWith('/api/movies/country/')) {
      const country = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByCountry(country));
    }
    else if (pathname.startsWith('/api/movies/region/')) {
      const region = decodeURIComponent(pathname.split('/')[4]);
      sendJson(res, getMoviesByRegion(region));
    }
    else if (pathname === '/api/movies/indian') {
      const indianMovies = mockMovies.filter(m => m.country === 'India');
      sendJson(res, indianMovies.sort((a, b) => b.avg_rating - a.avg_rating).slice(0, 20));
    }
    else if (pathname === '/api/movies' && req.method === 'POST') {
      const postData = await parsePostData(req);
      const newMovie = {
        movie_id: mockMovies.length + 1,
        title: postData.title,
        release_year: postData.release_year,
        duration: postData.duration,
        language: postData.language || 'English',
        synopsis: postData.synopsis || '',
        poster_url: postData.poster_url || '',
        trailer_url: postData.trailer_url || '',
        avg_rating: 0,
        total_ratings: 0,
        genres: [],
        country: 'United States',
        country_code: 'US',
        region: 'North America'
      };
      mockMovies.push(newMovie);
      sendJson(res, { message: 'Movie added', movie_id: newMovie.movie_id }, 201);
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
          m.country.toLowerCase().includes(searchLower) ||
          m.language.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply sorting with language support
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
        case 'country':
          filteredMovies.sort((a, b) => a.country.localeCompare(b.country));
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
    else if (pathname.match(/^\/api\/movies\/\d+\/similar$/)) {
      const movieId = parseInt(pathname.split('/')[3]);
      const movie = mockMovies.find(m => m.movie_id === movieId);
      if (movie) {
        const similar = mockMovies
          .filter(m => m.movie_id !== movieId && m.genres.some(g => movie.genres.includes(g)))
          .sort((a, b) => b.avg_rating - a.avg_rating)
          .slice(0, 8);
        sendJson(res, similar);
      } else {
        sendJson(res, []);
      }
    }
    else if (pathname.startsWith('/api/movies/')) {
      const movieId = parseInt(pathname.split('/')[3]);
      const movie = mockMovies.find(m => m.movie_id === movieId);
      if (movie) {
        const movieReviews = [{
          rating_id: 1, score: 5,
          review_text: movie.country === 'India' ?
            `Amazing ${movie.language} cinema! Great representation of Indian culture.` :
            `Fantastic ${movie.country} film with brilliant storytelling.`,
          created_at: new Date().toISOString(),
          reviewer: 'Global Movie Enthusiast'
        }];
        const userReview = userRatings.find(r => r.movie_id === movieId);
        if (userReview && currentUser) {
          movieReviews.unshift({
            rating_id: userReview.rating_id, score: userReview.score,
            review_text: userReview.review_text, created_at: userReview.created_at,
            reviewer: currentUser.name
          });
        }
        sendJson(res, { ...movie, genres: movie.genres.join(', '), reviews: movieReviews });
      } else {
        sendJson(res, { error: 'Movie not found' }, 404);
      }
    }
    // Genres, countries, languages, regions routes
    else if (pathname === '/api/genres') {
      sendJson(res, mockGenres);
    }
    else if (pathname === '/api/countries') {
      sendJson(res, countries.map(country => ({ country })));
    }
    else if (pathname === '/api/languages') {
      sendJson(res, languages.map(language => ({ language })));
    }
    else if (pathname === '/api/regions') {
      sendJson(res, regions.map(region => ({ region })));
    }
    // Recommendations with language diversity
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
    else if (pathname === '/api/recommendations/indian') {
      const indianMovies = mockMovies.filter(m => m.country === 'India');
      const diverseIndian = [];
      const selectedLanguages = [...new Set(indianMovies.map(m => m.language))].slice(0, 8);
      selectedLanguages.forEach(lang => {
        const langMovie = indianMovies.find(m => m.language === lang);
        if (langMovie) diverseIndian.push(langMovie);
      });
      sendJson(res, diverseIndian);
    }
    else if (pathname === '/api/recommendations/languages') {
      // Language-diverse recommendations
      const diverseMovies = [];
      const selectedLanguages = [...new Set(mockMovies.map(m => m.language))].slice(0, 10);
      selectedLanguages.forEach(lang => {
        const langMovie = mockMovies.find(m => m.language === lang);
        if (langMovie) diverseMovies.push(langMovie);
      });
      sendJson(res, diverseMovies);
    }
    // Mood-based recommendations — proper classification with scoring
    else if (pathname === '/api/recommendations/mood') {
      const postData = await parsePostData(req);
      const mood = (postData.mood || '').toLowerCase();

      // Each mood has: preferred genres, keywords to match in synopsis, and genres to exclude
      const moodProfiles = {
        'happy': {
          genres: ['Comedy', 'Musical', 'Animation', 'Family'],
          keywords: ['joy', 'laugh', 'fun', 'celebrate', 'uplifting', 'heartwarming', 'friendship', 'cheerful', 'comedy', 'humor', 'wedding', 'festival', 'dance', 'party', 'bright'],
          exclude: ['Horror', 'Crime', 'War', 'Thriller']
        },
        'cheerful': {
          genres: ['Comedy', 'Musical', 'Animation', 'Family'],
          keywords: ['joy', 'celebration', 'happiness', 'fun', 'festive', 'bright', 'colorful', 'laugh', 'dance'],
          exclude: ['Horror', 'Thriller', 'Crime', 'War']
        },
        'sad': {
          genres: ['Drama'],
          keywords: ['loss', 'death', 'grief', 'tears', 'emotional', 'tragic', 'heartbreak', 'separation', 'farewell', 'sacrifice', 'struggle', 'suffering', 'lonely', 'sorrow', 'pain'],
          exclude: ['Comedy', 'Animation', 'Action', 'Musical']
        },
        'melancholy': {
          genres: ['Drama', 'Romance'],
          keywords: ['sorrow', 'loss', 'memory', 'rain', 'bittersweet', 'longing', 'alone', 'farewell', 'regret', 'past'],
          exclude: ['Action', 'Comedy', 'Animation']
        },
        'excited': {
          genres: ['Action', 'Adventure', 'Sci-Fi'],
          keywords: ['chase', 'battle', 'explosion', 'hero', 'mission', 'fight', 'power', 'epic', 'warrior', 'speed', 'adrenaline', 'intense'],
          exclude: ['Drama', 'Romance', 'Family']
        },
        'thrilled': {
          genres: ['Action', 'Thriller'],
          keywords: ['intense', 'edge', 'breathtaking', 'adrenaline', 'danger', 'suspense', 'climax', 'explosive'],
          exclude: ['Romance', 'Family', 'Animation']
        },
        'scared': {
          genres: ['Horror', 'Thriller'],
          keywords: ['ghost', 'haunted', 'murder', 'dark', 'death', 'fear', 'terror', 'supernatural', 'killer', 'suspense', 'creepy', 'evil', 'demon', 'curse'],
          exclude: ['Comedy', 'Animation', 'Family', 'Musical', 'Romance']
        },
        'spooky': {
          genres: ['Horror', 'Thriller', 'Mystery'],
          keywords: ['ghost', 'haunted', 'paranormal', 'curse', 'demon', 'evil', 'supernatural', 'possession', 'nightmare'],
          exclude: ['Comedy', 'Romance', 'Family', 'Musical']
        },
        'romantic': {
          genres: ['Romance'],
          keywords: ['love', 'romance', 'couple', 'relationship', 'heart', 'passion', 'wedding', 'marriage', 'dating', 'soulmate', 'kiss', 'destiny', 'together'],
          exclude: ['Horror', 'Crime', 'War', 'Action']
        },
        'love': {
          genres: ['Romance', 'Drama'],
          keywords: ['love', 'romance', 'couple', 'heart', 'passion', 'wedding', 'relationship', 'devotion', 'eternal'],
          exclude: ['Horror', 'Crime', 'War']
        },
        'adventurous': {
          genres: ['Adventure', 'Action', 'Fantasy', 'Sci-Fi'],
          keywords: ['journey', 'quest', 'explore', 'discover', 'treasure', 'world', 'hero', 'epic', 'kingdom', 'space', 'expedition', 'survival'],
          exclude: ['Romance', 'Drama', 'Horror']
        },
        'relaxed': {
          genres: ['Comedy', 'Animation', 'Family'],
          keywords: ['peaceful', 'calm', 'gentle', 'nature', 'simple', 'life', 'village', 'countryside', 'friendship', 'warm', 'cozy', 'sweet'],
          exclude: ['Horror', 'Thriller', 'Action', 'Crime', 'War']
        },
        'chill': {
          genres: ['Comedy', 'Animation', 'Family'],
          keywords: ['relax', 'easy', 'lighthearted', 'fun', 'casual', 'simple', 'feel-good'],
          exclude: ['Horror', 'Thriller', 'Action', 'Crime']
        },
        'angry': {
          genres: ['Action', 'Crime', 'Thriller'],
          keywords: ['revenge', 'justice', 'fight', 'battle', 'war', 'rebel', 'rage', 'destroy', 'confront', 'vendetta', 'betrayal', 'fury'],
          exclude: ['Romance', 'Comedy', 'Animation', 'Family', 'Musical']
        },
        'frustrated': {
          genres: ['Action', 'Thriller', 'Crime'],
          keywords: ['revenge', 'fight', 'struggle', 'overcome', 'justice', 'against', 'rebel'],
          exclude: ['Romance', 'Comedy', 'Animation', 'Family']
        },
        'bored': {
          genres: ['Adventure', 'Action', 'Comedy', 'Sci-Fi', 'Fantasy'],
          keywords: ['epic', 'amazing', 'incredible', 'spectacular', 'blockbuster', 'thrilling', 'exciting', 'mind-blowing'],
          exclude: []
        },
        'nostalgic': {
          genres: ['Drama', 'Family', 'Animation'],
          keywords: ['childhood', 'memory', 'past', 'growing up', 'home', 'family', 'classic', 'tradition', 'heritage', 'remember', 'old', 'youth', 'school'],
          exclude: ['Horror', 'Crime', 'Thriller']
        },
        'curious': {
          genres: ['Mystery', 'Sci-Fi', 'Thriller'],
          keywords: ['mystery', 'investigation', 'discover', 'secret', 'puzzle', 'detective', 'clue', 'conspiracy', 'unknown', 'truth', 'riddle', 'experiment'],
          exclude: ['Comedy', 'Musical', 'Family', 'Animation']
        },
        'energetic': {
          genres: ['Action', 'Adventure', 'Musical'],
          keywords: ['dance', 'fight', 'race', 'competition', 'battle', 'sport', 'energy', 'music', 'party', 'champion', 'power'],
          exclude: ['Drama', 'Horror']
        },
        'lonely': {
          genres: ['Romance', 'Drama'],
          keywords: ['love', 'friendship', 'connection', 'relationship', 'companion', 'together', 'bond', 'meet', 'stranger'],
          exclude: ['Horror', 'War', 'Crime']
        },
        'inspired': {
          genres: ['Drama'],
          keywords: ['dream', 'achieve', 'overcome', 'success', 'struggle', 'triumph', 'hero', 'journey', 'inspiring', 'hope', 'rise', 'change', 'courage'],
          exclude: ['Horror', 'Crime', 'Thriller']
        },
        'motivated': {
          genres: ['Drama', 'Action', 'Adventure'],
          keywords: ['champion', 'winner', 'train', 'overcome', 'achieve', 'goal', 'rise', 'fight', 'determination', 'never give up', 'victory'],
          exclude: ['Horror']
        },
        'dark': {
          genres: ['Horror', 'Thriller', 'Crime', 'Mystery'],
          keywords: ['dark', 'death', 'murder', 'evil', 'sinister', 'twisted', 'psychological', 'nightmare', 'corrupt', 'shadow'],
          exclude: ['Comedy', 'Animation', 'Family', 'Musical']
        },
        'funny': {
          genres: ['Comedy', 'Animation'],
          keywords: ['funny', 'hilarious', 'comedy', 'laugh', 'humor', 'comic', 'silly', 'parody', 'satire', 'prank', 'joke', 'witty'],
          exclude: ['Horror', 'Crime', 'Thriller', 'War']
        },
        'tense': {
          genres: ['Thriller', 'Mystery', 'Crime'],
          keywords: ['suspense', 'tension', 'nerve', 'edge', 'twist', 'chase', 'escape', 'trapped', 'danger', 'stakes', 'countdown'],
          exclude: ['Comedy', 'Animation', 'Family', 'Musical']
        },
        'peaceful': {
          genres: ['Drama', 'Animation', 'Family'],
          keywords: ['nature', 'calm', 'serene', 'quiet', 'gentle', 'beautiful', 'meditative', 'spiritual', 'garden', 'mountain'],
          exclude: ['Action', 'Horror', 'Thriller', 'Crime', 'War']
        }
      };

      // Find best matching mood profile
      let profile = null;
      for (const [key, prof] of Object.entries(moodProfiles)) {
        if (mood === key || mood.includes(key) || key.includes(mood)) {
          profile = prof;
          break;
        }
      }
      if (!profile) profile = { genres: ['Drama', 'Comedy', 'Action', 'Romance'], keywords: [], exclude: [] };

      // Score each movie for mood relevance
      const scoredMovies = mockMovies
        .filter(m => !m.genres.some(g => profile.exclude.includes(g)))
        .map(m => {
          let score = 0;
          // Genre match: +3 per matching genre
          score += m.genres.filter(g => profile.genres.includes(g)).length * 3;
          // Synopsis keyword match: +2 per keyword found
          if (m.synopsis && profile.keywords.length) {
            const syn = m.synopsis.toLowerCase();
            profile.keywords.forEach(kw => { if (syn.includes(kw)) score += 2; });
          }
          // Title keyword match: +1 per keyword found
          if (m.title && profile.keywords.length) {
            const ttl = m.title.toLowerCase();
            profile.keywords.forEach(kw => { if (ttl.includes(kw)) score += 1; });
          }
          // Rating boost
          score += m.avg_rating;
          return { ...m, mood_score: score };
        })
        .filter(m => m.mood_score > 2)
        .sort((a, b) => b.mood_score - a.mood_score)
        .slice(0, 60);

      sendJson(res, { movies: scoredMovies, matched_genres: profile.genres, mood: mood });
    }
    // Watchlist and history
    // Watchlist routes
    else if (pathname === '/api/watchlist' && req.method === 'GET') {
      const watchlistMovies = userWatchlist.map(wl => {
        const movie = mockMovies.find(m => m.movie_id === wl.movie_id);
        return movie ? { ...movie, added_on: wl.added_on } : null;
      }).filter(Boolean);
      sendJson(res, watchlistMovies);
    }
    else if (pathname.startsWith('/api/watchlist/') && req.method === 'POST') {
      const movieId = parseInt(pathname.split('/')[3]);
      if (!userWatchlist.find(w => w.movie_id === movieId)) {
        userWatchlist.push({ movie_id: movieId, added_on: new Date().toISOString() });
        sendJson(res, { message: 'Added to watchlist' }, 201);
      } else {
        sendJson(res, { message: 'Already in watchlist' });
      }
    }
    else if (pathname.startsWith('/api/watchlist/') && req.method === 'DELETE') {
      const movieId = parseInt(pathname.split('/')[3]);
      userWatchlist = userWatchlist.filter(w => w.movie_id !== movieId);
      sendJson(res, { message: 'Removed from watchlist' });
    }
    // Ratings
    else if (pathname === '/api/ratings' && req.method === 'POST') {
      const postData = await parsePostData(req);
      const existingIdx = userRatings.findIndex(r => r.movie_id === postData.movie_id);
      if (existingIdx >= 0) {
        userRatings[existingIdx].score = postData.score;
        userRatings[existingIdx].review_text = postData.review_text || '';
        userRatings[existingIdx].created_at = new Date().toISOString();
        sendJson(res, { message: 'Rating updated' });
      } else {
        userRatings.push({
          rating_id: userRatings.length + 100,
          movie_id: postData.movie_id,
          score: postData.score,
          review_text: postData.review_text || '',
          created_at: new Date().toISOString()
        });
        sendJson(res, { message: 'Rating submitted' }, 201);
      }
    }
    // User reviews
    else if (pathname === '/api/user/reviews') {
      const reviews = userRatings.map(r => {
        const movie = mockMovies.find(m => m.movie_id === r.movie_id);
        return {
          ...r,
          movie_title: movie ? movie.title : 'Unknown',
          movie_poster: movie ? movie.poster_url : '',
          movie_year: movie ? movie.release_year : null,
          movie_language: movie ? movie.language : '',
          movie_id: r.movie_id
        };
      }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      sendJson(res, reviews);
    }
    else if (pathname === '/api/watch-history') {
      sendJson(res, []);
    }
    else if (pathname.startsWith('/api/watch-history/') && req.method === 'POST') {
      sendJson(res, { message: 'Marked as watched' });
    }
    else if (pathname === '/api/admin/stats') {
      const totalRatings = mockMovies.reduce((sum, m) => sum + (m.total_ratings || 0), 0) + userRatings.length;
      sendJson(res, {
        total_users: mockUsers.length,
        total_movies: mockMovies.length,
        total_ratings: totalRatings,
        active_7d: mockUsers.length,
        platform_avg_rating: mockMovies.length
          ? (mockMovies.reduce((sum, m) => sum + (m.avg_rating || 0), 0) / mockMovies.length).toFixed(2)
          : '0.00'
      });
    }
    else if (pathname === '/api/admin/reviews') {
      const reviews = userRatings.map(r => {
        const movie = mockMovies.find(m => m.movie_id === r.movie_id);
        return {
          rating_id: r.rating_id,
          score: r.score,
          review_text: r.review_text,
          created_at: r.created_at,
          reviewer: currentUser ? currentUser.name : 'User',
          movie: movie ? movie.title : 'Unknown'
        };
      });
      sendJson(res, reviews);
    }
    else if (pathname === '/api/genres/popularity') {
      const genreStats = {};
      mockMovies.forEach(movie => {
        (movie.genres || []).forEach(genre => {
          if (!genreStats[genre]) genreStats[genre] = { count: 0, sum: 0 };
          genreStats[genre].count++;
          genreStats[genre].sum += movie.avg_rating || 0;
        });
      });
      sendJson(res, Object.entries(genreStats)
        .map(([name, s]) => ({
          genre_name: name,
          movie_count: s.count,
          avg_genre_rating: (s.sum / s.count).toFixed(2)
        }))
        .sort((a, b) => b.movie_count - a.movie_count));
    }
    else if (pathname.match(/^\/api\/admin\/reviews\/\d+$/) && req.method === 'DELETE') {
      const ratingId = parseInt(pathname.split('/')[4]);
      userRatings = userRatings.filter(r => r.rating_id !== ratingId);
      sendJson(res, { message: 'Review removed' });
    }
    else {
      sendJson(res, { error: 'API endpoint not found' }, 404);
    }
  }
  else if (apiOnly) {
    sendJson(res, { error: 'Not found' }, 404);
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
  const languageStats = {};
  const indianLanguageStats = {};
  
  mockMovies.forEach(movie => {
    regionStats[movie.region] = (regionStats[movie.region] || 0) + 1;
    countryStats[movie.country] = (countryStats[movie.country] || 0) + 1;
    languageStats[movie.language] = (languageStats[movie.language] || 0) + 1;
    if (movie.country === 'India') {
      indianLanguageStats[movie.language] = (indianLanguageStats[movie.language] || 0) + 1;
    }
  });
  
  const modeLabel = apiOnly ? 'API backend' : 'full stack';
  console.log(`\n🌍 CineMatch ${modeLabel} running at http://localhost:${port}/`);
  console.log(`✅ Total Movies: ${mockMovies.length}`);
  console.log(`🌍 Countries: ${Object.keys(countryStats).length}`);
  console.log(`🗺️ Regions: ${Object.keys(regionStats).length}`);
  console.log(`🗣️ Languages: ${Object.keys(languageStats).length}`);
  console.log(`🇮🇳 Indian Languages: ${Object.keys(indianLanguageStats).length}`);
  console.log(`🎭 Genres: ${mockGenres.length}`);
  console.log(`✅ Language-based sorting enabled`);
  console.log(`✅ All Indian regional cinema included`);
  
  console.log('\n🗣️ Top 10 Languages by Movie Count:');
  Object.entries(languageStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .forEach(([language, count]) => {
      console.log(`   ${language}: ${count} movies`);
    });
  
  console.log('\n🇮🇳 Indian Languages Breakdown:');
  Object.entries(indianLanguageStats)
    .sort((a, b) => b[1] - a[1])
    .forEach(([language, count]) => {
      console.log(`   ${language}: ${count} movies`);
    });
  
  console.log('\n🎬 Top 10 Movies Worldwide:');
  mockMovies.slice(0, 10).forEach((movie, index) => {
    const flag = getCountryFlag(movie.country_code);
    const langInfo = movie.country === 'India' ? ` [${movie.language}]` : '';
    console.log(`${index + 1}. ${flag} ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5 [${movie.country}]${langInfo}`);
  });
});
