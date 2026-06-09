const https = require('https');
const fs = require('fs');

// TMDB API configuration
const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // Public demo key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Indian languages with their language codes
const indianLanguages = [
  { code: 'hi', name: 'Hindi', region: 'Bollywood' },
  { code: 'ta', name: 'Tamil', region: 'Kollywood' },
  { code: 'te', name: 'Telugu', region: 'Tollywood' },
  { code: 'ml', name: 'Malayalam', region: 'Mollywood' },
  { code: 'kn', name: 'Kannada', region: 'Sandalwood' },
  { code: 'bn', name: 'Bengali', region: 'Tollywood' },
  { code: 'pa', name: 'Punjabi', region: 'Pollywood' },
  { code: 'mr', name: 'Marathi', region: 'Marathi Cinema' },
  { code: 'gu', name: 'Gujarati', region: 'Gujarati Cinema' },
  { code: 'or', name: 'Odia', region: 'Odia Cinema' },
  { code: 'as', name: 'Assamese', region: 'Assamese Cinema' }
];

function fetchMovieData(movieId) {
  return new Promise((resolve, reject) => {
    const url = `${TMDB_BASE_URL}/movie/${movieId}?api_key=${TMDB_API_KEY}&language=en-US`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const movie = JSON.parse(data);
          resolve(movie);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

function discoverIndianMovies(language, page = 1) {
  return new Promise((resolve, reject) => {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&region=IN&with_original_language=${language.code}&sort_by=popularity.desc&page=${page}&vote_count.gte=5`;
    
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response);
        } catch (error) {
          reject(error);
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

async function fetchAllIndianLanguageMovies() {
  console.log('🇮🇳 Fetching Indian movies from all languages...');
  const allIndianMovies = [];
  let totalFetched = 0;
  
  for (const lang of indianLanguages) {
    console.log(`\n🎬 Fetching ${lang.name} movies (${lang.region})...`);
    let languageMovies = [];
    
    try {
      // Fetch first 3 pages for each language (60 movies per language)
      for (let page = 1; page <= 3; page++) {
        console.log(`   Fetching page ${page}...`);
        
        const response = await discoverIndianMovies(lang, page);
        const movieResults = response.results || [];
        
        for (const movie of movieResults) {
          try {
            if (movie.poster_path && movie.vote_count >= 5) {
              // Get full movie details for better data
              const fullMovie = await fetchMovieData(movie.id);
              
              const processedMovie = {
                movie_id: movie.id,
                title: movie.title,
                release_year: new Date(movie.release_date).getFullYear() || null,
                avg_rating: movie.vote_average / 2, // Convert 10-point to 5-point scale
                total_ratings: movie.vote_count,
                poster_url: `${IMAGE_BASE_URL}${movie.poster_path}`,
                synopsis: movie.overview || 'No synopsis available.',
                genres: fullMovie.genres ? fullMovie.genres.map(g => g.name) : [],
                duration: fullMovie.runtime || null,
                language: lang.name,
                language_code: lang.code,
                region: lang.region,
                country: 'India',
                country_code: 'IN',
                adult: movie.adult || false,
                is_indian: true
              };
              
              languageMovies.push(processedMovie);
              totalFetched++;
              console.log(`   ✓ ${movie.title} (${movie.release_date?.split('-')[0]})`);
            }
            
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50));
            
          } catch (error) {
            console.log(`   ✗ Failed to fetch details for ${movie.title}: ${error.message}`);
          }
        }
        
        // Add delay between pages
        await new Promise(resolve => setTimeout(resolve, 300));
      }
      
      allIndianMovies.push(...languageMovies);
      console.log(`   ✅ Fetched ${languageMovies.length} ${lang.name} movies from ${lang.region}`);
      
    } catch (error) {
      console.log(`   ✗ Error fetching ${lang.name} movies: ${error.message}`);
    }
    
    // Add delay between languages
    await new Promise(resolve => setTimeout(resolve, 800));
  }
  
  console.log(`\n🇮🇳 Successfully fetched ${totalFetched} Indian movies from ${indianLanguages.length} languages`);
  return allIndianMovies;
}

async function main() {
  try {
    const allIndianMovies = await fetchAllIndianLanguageMovies();
    
    // Remove duplicates based on movie_id
    const uniqueIndianMovies = [];
    const seenIds = new Set();
    
    allIndianMovies.forEach(movie => {
      if (!seenIds.has(movie.movie_id)) {
        seenIds.add(movie.movie_id);
        uniqueIndianMovies.push(movie);
      }
    });
    
    // Sort by rating (highest first)
    uniqueIndianMovies.sort((a, b) => b.avg_rating - a.avg_rating);
    
    // Save to file
    fs.writeFileSync('indian-all-languages.json', JSON.stringify(uniqueIndianMovies, null, 2));
    
    // Statistics by language
    const languageStats = {};
    const regionStats = {};
    
    uniqueIndianMovies.forEach(movie => {
      languageStats[movie.language] = (languageStats[movie.language] || 0) + 1;
      regionStats[movie.region] = (regionStats[movie.region] || 0) + 1;
    });
    
    console.log(`\n✅ Indian All-Language Movie Database Created:`);
    console.log(`   - Total unique movies: ${uniqueIndianMovies.length}`);
    console.log(`   - Languages covered: ${Object.keys(languageStats).length}`);
    console.log(`   - Regions covered: ${Object.keys(regionStats).length}`);
    console.log(`   - Duplicates removed: ${allIndianMovies.length - uniqueIndianMovies.length}`);
    
    console.log(`\n📊 Movies by Language:`);
    Object.entries(languageStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([language, count]) => {
        console.log(`   ${language}: ${count} movies`);
      });
    
    console.log(`\n🎭 Movies by Region:`);
    Object.entries(regionStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([region, count]) => {
        console.log(`   ${region}: ${count} movies`);
      });
    
    console.log(`\n🇮🇳 Top 20 Indian Movies (All Languages):`);
    uniqueIndianMovies.slice(0, 20).forEach((movie, index) => {
      console.log(`${index + 1}. 🇮🇳 ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5 [${movie.language}]`);
    });
    
    console.log(`\n🎬 Top Movies by Language:`);
    Object.entries(languageStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([language, count]) => {
        console.log(`\n📽️ ${language} (${count} movies):`);
        uniqueIndianMovies
          .filter(m => m.language === language)
          .slice(0, 3)
          .forEach((movie, index) => {
            console.log(`   ${index + 1}. ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5`);
          });
      });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
