const fs = require('fs');

function combineMovieDatabases() {
  try {
    // Load Hollywood movies
    let hollywoodMovies = [];
    try {
      const hollywoodData = fs.readFileSync('./movies-data.json', 'utf8');
      hollywoodMovies = JSON.parse(hollywoodData);
      console.log(`Loaded ${hollywoodMovies.length} Hollywood movies`);
    } catch (error) {
      console.log('Error loading Hollywood movies:', error.message);
    }

    // Load Indian movies
    let indianMovies = [];
    try {
      const indianData = fs.readFileSync('./real-indian-movies.json', 'utf8');
      indianMovies = JSON.parse(indianData);
      console.log(`Loaded ${indianMovies.length} Indian movies`);
    } catch (error) {
      console.log('Error loading Indian movies:', error.message);
    }

    // Mark movies by origin
    hollywoodMovies.forEach(movie => {
      movie.is_indian = false;
      movie.region = 'Hollywood';
    });

    indianMovies.forEach(movie => {
      movie.is_indian = true;
      movie.region = 'Indian';
    });

    // Combine all movies
    const allMovies = [...hollywoodMovies, ...indianMovies];
    
    // Remove duplicates based on movie_id
    const uniqueMovies = [];
    const seenIds = new Set();
    
    allMovies.forEach(movie => {
      if (!seenIds.has(movie.movie_id)) {
        seenIds.add(movie.movie_id);
        uniqueMovies.push(movie);
      }
    });

    // Sort by rating (highest first)
    uniqueMovies.sort((a, b) => b.avg_rating - a.avg_rating);

    // Save combined database
    fs.writeFileSync('combined-movies.json', JSON.stringify(uniqueMovies, null, 2));
    
    console.log(`\n✅ Combined movie database created:`);
    console.log(`   - Total unique movies: ${uniqueMovies.length}`);
    console.log(`   - Hollywood movies: ${hollywoodMovies.length}`);
    console.log(`   - Indian movies: ${indianMovies.length}`);
    console.log(`   - Duplicates removed: ${allMovies.length - uniqueMovies.length}`);

    // Display sample of combined movies
    console.log(`\n🎬 Top 15 movies from combined database:`);
    uniqueMovies.slice(0, 15).forEach((movie, index) => {
      const flag = movie.is_indian ? '🇮🇳' : '🇺🇸';
      const region = movie.is_indian ? 'Indian' : 'Hollywood';
      console.log(`${index + 1}. ${flag} ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5 [${region}]`);
    });

    // Genre statistics
    const allGenres = new Set();
    const indianGenres = new Set();
    const hollywoodGenres = new Set();

    uniqueMovies.forEach(movie => {
      movie.genres.forEach(genre => {
        allGenres.add(genre);
        if (movie.is_indian) {
          indianGenres.add(genre);
        } else {
          hollywoodGenres.add(genre);
        }
      });
    });

    console.log(`\n📊 Genre Statistics:`);
    console.log(`   - Total genres: ${allGenres.size}`);
    console.log(`   - Indian movie genres: ${indianGenres.size}`);
    console.log(`   - Hollywood movie genres: ${hollywoodGenres.size}`);
    
    console.log(`\n🎭 Indian Movie Genres: ${Array.from(indianGenres).join(', ')}`);
    console.log(`🎭 Hollywood Movie Genres: ${Array.from(hollywoodGenres).join(', ')}`);

    return uniqueMovies;

  } catch (error) {
    console.error('Error combining movie databases:', error);
    return [];
  }
}

combineMovieDatabases();
