const https = require('https');
const fs = require('fs');

// TMDB API configuration
const TMDB_API_KEY = '8265bd1679663a7ea12ac168da84d2e8'; // Public demo key
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const IMAGE_BASE_URL = 'https://image.tmdb.org/t/p/w500';

// Popular Indian movie IDs (Bollywood, Tollywood, Kollywood, etc.)
const indianMovieIds = [
  // Bollywood Blockbusters
  315698, // Dangal
  275204, // Baahubali 2: The Conclusion
  266500, // Baahubali: The Beginning
  466272, // Gully Boy
  399566, // War
  546554, // Chhichhore
  603692, // Laxmii
  718945, // Thugs of Hindostan
  508443, // 2.0
  578, // Slumdog Millionaire
  604822, // Kabir Singh
  539885, // Uri: The Surgical Strike
  424694, // Padmaavat
  587807, // Tanhaji: The Unsung Warrior
  696506, // Sardar Udham
  718821, // Shershaah
  726939, // RRR
  730154, // K.G.F: Chapter 2
  76757, // 3 Idiots
  791373, // The Kashmir Files
  818397, // Brahmāstra: Part One – Shiva
  872585, // Pathaan
  934433, // Jawan
  9648, // Lagaan: Once Upon a Time in India
  1022789, // Animal
  713704, // Gangubai Kathiawadi
  718444, // Sooryavanshi
  722638, // Bell Bottom
  726209, // Pushpa: The Rise
  726839, // Major
  730459, // Vikram Vedha
  744276, // Drishyam 2
  749974, // Bhool Bhulaiyaa 2
  76600, // Bajrangi Bhaijaan
  615904, // Good Newwz
  615902, // Housefull 4
  695721, // Panipat
  615677, // Mission Mangal
  615678, // Chhalaang
  646389, // Thappad
  675353, // Gunjan Saxena: The Kargil Girl
  640, // Dil Chahta Hai
  24428, // Munna Bhai M.B.B.S.
  299534, // Bajrangi Bhaijaan
  609681, // Kabir Singh
  571374, // Andhadhun
  527774, // Stree
  603, // The Lunchbox
  460465, // Dangal
  338762, // Sultan
  299536, // Avengers: Infinity War (Indian release)
  99861, // PK
  15707, // Dhoom 3
  603, // The Lunchbox
  475557, // Joker (Indian context)
  634649, // Gully Boy
  496243, // Uri: The Surgical Strike
  572714, // Manikarnika: The Queen of War
  385687, // Raazi
  335984, // Pad Man
  466272, // Gully Boy
  438631, // The Sky Is Pink
  976573, // Thalaivi
  615904, // Good Newwz
  545609, // Housefull 4
  453395, // War
  502795, // Chhichhore
  497, // Lagaan
  74412, // 3 Idiots
  726209, // Pushpa: The Rise
  730154, // K.G.F: Chapter 2
  726939, // RRR
  872585, // Pathaan
  934433, // Jawan
  1022789, // Animal
  // South Indian Cinema
  578, // Slumdog Millionaire (International)
  603, // The Lunchbox
  603692, // Laxmii
  508443, // 2.0 (Tamil)
  539885, // Uri: The Surgical Strike
  587807, // Tanhaji: The Unsung Warrior
  696506, // Sardar Udham
  718821, // Shershaah
  726939, // RRR (Telugu)
  730154, // K.G.F: Chapter 2 (Kannada)
  76757, // 3 Idiots
  791373, // The Kashmir Files
  818397, // Brahmāstra: Part One – Shiva
  872585, // Pathaan
  934433, // Jawan
  9648, // Lagaan: Once Upon a Time in India
  1022789, // Animal
  713704, // Gangubai Kathiawadi
  718444, // Sooryavanshi
  722638, // Bell Bottom
  726209, // Pushpa: The Rise (Telugu)
  726839, // Major
  730459, // Vikram Vedha
  744276, // Drishyam 2
  749974, // Bhool Bhulaiyaa 2
  76600, // Bajrangi Bhaijaan
  615904, // Good Newwz
  615902, // Housefull 4
  695721, // Panipat
  615677, // Mission Mangal
  615678, // Chhalaang
  646389, // Thappad
  675353, // Gunjan Saxena: The Kargil Girl
  640, // Dil Chahta Hai
  24428, // Munna Bhai M.B.B.S.
  299534, // Bajrangi Bhaijaan
  609681, // Kabir Singh
  571374, // Andhadhun
  527774, // Stree
  603, // The Lunchbox
  460465, // Dangal
  338762, // Sultan
  299536, // Avengers: Infinity War
  99861, // PK
  15707, // Dhoom 3
  603, // The Lunchbox
  475557, // Joker
  634649, // Gully Boy
  496243, // Uri: The Surgical Strike
  572714, // Manikarnika: The Queen of War
  385687, // Raazi
  335984, // Pad Man
  466272, // Gully Boy
  438631, // The Sky Is Pink
  976573, // Thalaivi
  615904, // Good Newwz
  545609, // Housefull 4
  453395, // War
  502795, // Chhichhore
  497, // Lagaan
  74412, // 3 Idiots
  // Regional Cinema IDs (deduplication and more variety)
  603, // The Lunchbox
  578, // Slumdog Millionaire
  603692, // Laxmii
  508443, // 2.0
  539885, // Uri: The Surgical Strike
  587807, // Tanhaji: The Unsung Warrior
  696506, // Sardar Udham
  718821, // Shershaah
  726939, // RRR
  730154, // K.G.F: Chapter 2
  76757, // 3 Idiots
  791373, // The Kashmir Files
  818397, // Brahmāstra: Part One – Shiva
  872585, // Pathaan
  934433, // Jawan
  9648, // Lagaan
  1022789, // Animal
  713704, // Gangubai Kathiawadi
  718444, // Sooryavanshi
  722638, // Bell Bottom
  726209, // Pushpa: The Rise
  726839, // Major
  730459, // Vikram Vedha
  744276, // Drishyam 2
  749974, // Bhool Bhulaiyaa 2
  76600, // Bajrangi Bhaijaan
  615904, // Good Newwz
  615902, // Housefull 4
  695721, // Panipat
  615677, // Mission Mangal
  615678, // Chhalaang
  646389, // Thappad
  675353, // Gunjan Saxena: The Kargil Girl
  640, // Dil Chahta Hai
  24428, // Munna Bhai M.B.B.S.
  299534, // Bajrangi Bhaijaan
  609681, // Kabir Singh
  571374, // Andhadhun
  527774, // Stree
  603, // The Lunchbox
  460465, // Dangal
  338762, // Sultan
  299536, // Avengers: Infinity War
  99861, // PK
  15707, // Dhoom 3
  603, // The Lunchbox
  475557, // Joker
  634649, // Gully Boy
  496243, // Uri: The Surgical Strike
  572714, // Manikarnika: The Queen of War
  385687, // Raazi
  335984, // Pad Man
  466272, // Gully Boy
  438631, // The Sky Is Pink
  976573, // Thalaivi
  615904, // Good Newwz
  545609, // Housefull 4
  453395, // War
  502795, // Chhichhore
  497, // Lagaan
  74412 // 3 Idiots
].filter((id, index, self) => self.indexOf(id) === index); // Remove duplicates

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

async function fetchIndianMovies() {
  console.log('Fetching Indian movie data from TMDB...');
  const movies = [];
  let successCount = 0;
  
  for (const movieId of indianMovieIds) {
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
          adult: movie.adult || false,
          origin_country: movie.production_countries ? movie.production_countries.map(c => c.name) : [],
          is_indian: true
        };
        
        movies.push(processedMovie);
        successCount++;
        console.log(`✓ Fetched: ${movie.title} (${movie.original_language.toUpperCase()})`);
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
      
    } catch (error) {
      console.log(`✗ Failed to fetch movie ID ${movieId}: ${error.message}`);
    }
  }
  
  console.log(`\nSuccessfully fetched ${successCount} Indian movies out of ${indianMovieIds.length} attempted`);
  return movies;
}

async function main() {
  try {
    const indianMovies = await fetchIndianMovies();
    
    // Sort by rating
    indianMovies.sort((a, b) => b.avg_rating - a.avg_rating);
    
    // Save to file
    fs.writeFileSync('indian-movies-data.json', JSON.stringify(indianMovies, null, 2));
    console.log(`\n✅ Saved ${indianMovies.length} Indian movies to indian-movies-data.json`);
    
    // Display sample
    console.log('\n🎬 Sample Indian movies:');
    indianMovies.slice(0, 10).forEach((movie, index) => {
      console.log(`${index + 1}. ${movie.title} (${movie.release_year}) - Rating: ${movie.avg_rating.toFixed(1)}/5 [${movie.language.toUpperCase()}]`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
