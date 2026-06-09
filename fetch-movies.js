const https = require('https');
const fs = require('fs');

// TMDB API configuration
const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // Public demo key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Popular movie IDs (these are TMDB IDs)
const popularMovieIds = [
  155, 278052, 550, 13, 157336, 299536, 99861, 15707, 603, 577922,
  76341, 475557, 634649, 496243, 572714, 385687, 338762, 460465,
  508943, 546554, 424, 872585, 566525, 717188, 438631, 976573,
  615904, 545609, 453395, 502795, 497, 74412, 640, 24428, 299534,
  726209, 730154, 429617, 609681, 571374, 615678, 646389, 578,
  533535, 9648, 335984, 466272, 718444, 726939, 675353, 726839,
  730459, 1022789, 818397, 76600, 713704, 722638, 696506, 934433,
  76757, 744276, 615902, 695721, 791373, 749974, 581392, 615677,
  718945, 872585, 527774, 508443, 604822, 539885, 424694, 587807,
  696506, 718821, 726939, 730154, 76757, 791373, 818397, 872585,
  934433, 9648, 1022789, 713704, 718444, 718821, 718945, 722638,
  726209, 726839, 730154, 730459, 744276, 749974, 76600, 791373,
  818397, 872585, 934433, 9648, 1022789
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

async function fetchAllMovies() {
  console.log('Fetching movie data from TMDB...');
  const movies = [];
  let successCount = 0;
  
  for (const movieId of popularMovieIds) {
    try {
      const movie = await fetchMovieData(movieId);
      
      // Only include movies with poster images
      if (movie.poster_path) {
        const processedMovie = {
          movie_id: movie.id,
          title: movie.title,
          release_year: new Date(movie.release_date).getFullYear() || null,
          avg_rating: movie.vote_average / 2, // Convert 10-point to 5-point scale
          total_ratings: movie.vote_count,
          poster_url: `${IMAGE_BASE_URL}${movie.poster_path}`,
          synopsis: movie.overview || 'No synopsis available.',
          genres: movie.genres ? movie.genres.map(g => g.name) : [],
          duration: movie.runtime || null,
          language: movie.original_language || 'Unknown',
          adult: movie.adult || false
        };
        
        movies.push(processedMovie);
        successCount++;
        console.log(`✓ Fetched: ${movie.title}`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`✗ Failed to fetch movie ID ${movieId}: ${error.message}`);
    }
  }
  
  console.log(`\nSuccessfully fetched ${successCount} movies out of ${popularMovieIds.length} attempted`);
  return movies;
}

async function main() {
  try {
    const movies = await fetchAllMovies();
    
    // Sort by rating
    movies.sort((a, b) => b.avg_rating - a.avg_rating);
    
    // Save to file
    fs.writeFileSync('movies-data.json', JSON.stringify(movies, null, 2));
    console.log(`\n✅ Saved ${movies.length} movies to movies-data.json`);
    
    // Display sample
    console.log('\n📽️  Sample movies:');
    movies.slice(0, 10).forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.release_year}) - Rating: ${movie.avg_rating.toFixed(1)}/5`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
