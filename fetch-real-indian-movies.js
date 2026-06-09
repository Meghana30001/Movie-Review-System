const https = require('https');
const fs = require('fs');

// TMDB API configuration
const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // Public demo key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

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

function discoverIndianMovies(page = 1) {
  return new Promise((resolve, reject) => {
    const url = `${TMDB_BASE_URL}/discover/movie?api_key=${TMDB_API_KEY}&language=en-US&region=IN&with_original_language=hi&sort_by=popularity.desc&page=${page}`;
    
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

async function fetchIndianMovies() {
  console.log('Fetching Indian movies from TMDB...');
  const movies = [];
  let successCount = 0;
  
  try {
    // Fetch multiple pages of Indian movies
    for (let page = 1; page <= 5; page++) {
      console.log(`Fetching page ${page} of Indian movies...`);
      
      const response = await discoverIndianMovies(page);
      const movieResults = response.results || [];
      
      for (const movie of movieResults) {
        try {
          if (movie.poster_path) {
            const processedMovie = {
              movie_id: movie.id,
              title: movie.title,
              release_year: new Date(movie.release_date).getFullYear() || null,
              avg_rating: movie.vote_average / 2, // Convert 10-point to 5-point scale
              total_ratings: movie.vote_count,
              poster_url: `${IMAGE_BASE_URL}${movie.poster_path}`,
              synopsis: movie.overview || 'No synopsis available.',
              genres: [], // Will be filled when we get full movie details
              duration: null,
              language: movie.original_language || 'hi',
              adult: movie.adult || false,
              is_indian: true
            };
            
            // Get full movie details including genres
            const fullMovie = await fetchMovieData(movie.id);
            if (fullMovie.genres) {
              processedMovie.genres = fullMovie.genres.map(g => g.name);
            }
            if (fullMovie.runtime) {
              processedMovie.duration = fullMovie.runtime;
            }
            
            movies.push(processedMovie);
            successCount++;
            console.log(`✓ Fetched: ${movie.title} (${movie.release_date?.split('-')[0]})`);
          }
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
          
        } catch (error) {
          console.log(`✗ Failed to fetch details for ${movie.title}: ${error.message}`);
        }
      }
      
      // Add delay between pages
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
  } catch (error) {
    console.error('Error fetching Indian movies:', error);
  }
  
  console.log(`\nSuccessfully fetched ${successCount} Indian movies`);
  return movies;
}

async function main() {
  try {
    const indianMovies = await fetchIndianMovies();
    
    // Sort by rating
    indianMovies.sort((a, b) => b.avg_rating - a.avg_rating);
    
    // Save to file
    fs.writeFileSync('real-indian-movies.json', JSON.stringify(indianMovies, null, 2));
    console.log(`\n✅ Saved ${indianMovies.length} Indian movies to real-indian-movies.json`);
    
    // Display sample
    console.log('\n🎬 Sample Indian movies:');
    indianMovies.slice(0, 15).forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.release_year}) - Rating: ${movie.avg_rating.toFixed(1)}/5 [${movie.language.toUpperCase()}]`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
