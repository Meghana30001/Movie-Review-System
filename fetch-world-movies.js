const https = require('https');
const fs = require('fs');

// TMDB API configuration
const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // Public demo key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Countries to fetch movies from (ISO country codes)
const countries = [
  { code: 'US', name: 'United States', language: 'en' },
  { code: 'IN', name: 'India', language: 'hi' },
  { code: 'GB', name: 'United Kingdom', language: 'en' },
  { code: 'JP', name: 'Japan', language: 'ja' },
  { code: 'KR', name: 'South Korea', language: 'ko' },
  { code: 'FR', name: 'France', language: 'fr' },
  { code: 'DE', name: 'Germany', language: 'de' },
  { code: 'IT', name: 'Italy', language: 'it' },
  { code: 'ES', name: 'Spain', language: 'es' },
  { code: 'CN', name: 'China', language: 'zh' },
  { code: 'HK', name: 'Hong Kong', language: 'zh' },
  { code: 'RU', name: 'Russia', language: 'ru' },
  { code: 'MX', name: 'Mexico', language: 'es' },
  { code: 'BR', name: 'Brazil', language: 'pt' },
  { code: 'CA', name: 'Canada', language: 'en' },
  { code: 'AU', name: 'Australia', language: 'en' },
  { code: 'TH', name: 'Thailand', language: 'th' },
  { code: 'TR', name: 'Turkey', language: 'tr' },
  { code: 'SE', name: 'Sweden', language: 'sv' },
  { code: 'NO', name: 'Norway', language: 'no' }
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

function discoverMovies(country, language, page = 1) {
  return new Promise((resolve, reject) => {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&region=${country.code}&with_original_language=${language}&sort_by=popularity.desc&page=${page}&vote_count.gte=10`;
    
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

async function fetchWorldMovies() {
  console.log('🌍 Fetching movies from around the world...');
  const allMovies = [];
  let totalFetched = 0;
  
  for (const country of countries) {
    console.log(`\n🎬 Fetching movies from ${country.name} (${country.code})...`);
    let countryMovies = [];
    
    try {
      // Fetch first 2 pages for each country (40 movies per country)
      for (let page = 1; page <= 2; page++) {
        console.log(`   Fetching page ${page}...`);
        
        const response = await discoverMovies(country, country.language, page);
        const movieResults = response.results || [];
        
        for (const movie of movieResults) {
          try {
            if (movie.poster_path && movie.vote_count >= 10) {
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
                language: movie.original_language || language,
                adult: movie.adult || false,
                country: country.name,
                country_code: country.code,
                region: getRegion(country.code)
              };
              
              countryMovies.push(processedMovie);
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
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      allMovies.push(...countryMovies);
      console.log(`   ✅ Fetched ${countryMovies.length} movies from ${country.name}`);
      
    } catch (error) {
      console.log(`   ✗ Error fetching from ${country.name}: ${error.message}`);
    }
    
    // Add delay between countries
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`\n🌍 Successfully fetched ${totalFetched} movies from ${countries.length} countries`);
  return allMovies;
}

function getRegion(countryCode) {
  const regions = {
    'US': 'North America',
    'CA': 'North America',
    'MX': 'North America',
    'BR': 'South America',
    'GB': 'Europe',
    'FR': 'Europe',
    'DE': 'Europe',
    'IT': 'Europe',
    'ES': 'Europe',
    'SE': 'Europe',
    'NO': 'Europe',
    'RU': 'Europe',
    'TR': 'Europe/Asia',
    'IN': 'Asia',
    'CN': 'Asia',
    'HK': 'Asia',
    'JP': 'Asia',
    'KR': 'Asia',
    'TH': 'Asia',
    'AU': 'Oceania'
  };
  return regions[countryCode] || 'Other';
}

async function main() {
  try {
    const worldMovies = await fetchWorldMovies();
    
    // Remove duplicates based on movie_id
    const uniqueMovies = [];
    const seenIds = new Set();
    
    worldMovies.forEach(movie => {
      if (!seenIds.has(movie.movie_id)) {
        seenIds.add(movie.movie_id);
        uniqueMovies.push(movie);
      }
    });
    
    // Sort by rating (highest first)
    uniqueMovies.sort((a, b) => b.avg_rating - a.avg_rating);
    
    // Save to file
    fs.writeFileSync('world-movies-database.json', JSON.stringify(uniqueMovies, null, 2));
    
    // Statistics
    const countryStats = {};
    const regionStats = {};
    
    uniqueMovies.forEach(movie => {
      countryStats[movie.country] = (countryStats[movie.country] || 0) + 1;
      regionStats[movie.region] = (regionStats[movie.region] || 0) + 1;
    });
    
    console.log(`\n✅ World Movie Database Created:`);
    console.log(`   - Total unique movies: ${uniqueMovies.length}`);
    console.log(`   - Countries represented: ${Object.keys(countryStats).length}`);
    console.log(`   - Regions covered: ${Object.keys(regionStats).length}`);
    console.log(`   - Duplicates removed: ${worldMovies.length - uniqueMovies.length}`);
    
    console.log(`\n📊 Movies by Country:`);
    Object.entries(countryStats)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([country, count]) => {
        console.log(`   ${country}: ${count} movies`);
      });
    
    console.log(`\n🌍 Movies by Region:`);
    Object.entries(regionStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([region, count]) => {
        console.log(`   ${region}: ${count} movies`);
      });
    
    console.log(`\n🎬 Top 20 Movies Worldwide:`);
    uniqueMovies.slice(0, 20).forEach((movie, index) => {
      const flag = getCountryFlag(movie.country_code);
      console.log(`${index + 1}. ${flag} ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5 [${movie.country}]`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
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

main();
