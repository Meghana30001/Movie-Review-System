const fs = require('fs');

function enhanceMovieClassification() {
  try {
    // Load current movie database
    const movies = JSON.parse(fs.readFileSync('./ultimate-movie-database.json', 'utf8'));
    console.log(`Processing ${movies.length} movies for enhanced classification...`);
    
    // Classification categories
    const classifications = {
      genres: {},
      languages: {},
      countries: {},
      regions: {},
      decades: {},
      ratingCategories: {},
      movieTypes: {
        'Classic': [],
        'Contemporary': [],
        'Recent': [],
        'Upcoming': []
      },
      contentTypes: {
        'Family Friendly': [],
        'Adult Content': [],
        'Teen': []
      }
    };
    
    // Process each movie
    movies.forEach(movie => {
      // Genre classification
      movie.genres.forEach(genre => {
        if (!classifications.genres[genre]) {
          classifications.genres[genre] = [];
        }
        classifications.genres[genre].push(movie.movie_id);
      });
      
      // Language classification
      if (!classifications.languages[movie.language]) {
        classifications.languages[movie.language] = [];
      }
      classifications.languages[movie.language].push(movie.movie_id);
      
      // Country classification
      if (!classifications.countries[movie.country]) {
        classifications.countries[movie.country] = [];
      }
      classifications.countries[movie.country].push(movie.movie_id);
      
      // Region classification
      if (!classifications.regions[movie.region]) {
        classifications.regions[movie.region] = [];
      }
      classifications.regions[movie.region].push(movie.movie_id);
      
      // Decade classification
      const decade = movie.release_year ? Math.floor(movie.release_year / 10) * 10 : 'Unknown';
      const decadeLabel = decade === 'Unknown' ? 'Unknown' : `${decade}s`;
      if (!classifications.decades[decadeLabel]) {
        classifications.decades[decadeLabel] = [];
      }
      classifications.decades[decadeLabel].push(movie.movie_id);
      
      // Rating classification
      const rating = movie.avg_rating || 0;
      let ratingCategory;
      if (rating >= 4.5) ratingCategory = 'Excellent';
      else if (rating >= 4.0) ratingCategory = 'Very Good';
      else if (rating >= 3.5) ratingCategory = 'Good';
      else if (rating >= 3.0) ratingCategory = 'Average';
      else if (rating >= 2.0) ratingCategory = 'Below Average';
      else ratingCategory = 'Poor';
      
      if (!classifications.ratingCategories[ratingCategory]) {
        classifications.ratingCategories[ratingCategory] = [];
      }
      classifications.ratingCategories[ratingCategory].push(movie.movie_id);
      
      // Movie type by year
      const currentYear = new Date().getFullYear();
      if (movie.release_year < 1970) {
        classifications.movieTypes['Classic'].push(movie.movie_id);
      } else if (movie.release_year < 2000) {
        classifications.movieTypes['Contemporary'].push(movie.movie_id);
      } else if (movie.release_year <= currentYear - 2) {
        classifications.movieTypes['Recent'].push(movie.movie_id);
      } else if (movie.release_year > currentYear) {
        classifications.movieTypes['Upcoming'].push(movie.movie_id);
      }
      
      // Content type classification
      if (movie.adult) {
        classifications.contentTypes['Adult Content'].push(movie.movie_id);
      } else if (movie.genres && (movie.genres.includes('Family') || movie.genres.includes('Animation'))) {
        classifications.contentTypes['Family Friendly'].push(movie.movie_id);
      } else {
        classifications.contentTypes['Teen'].push(movie.movie_id);
      }
      
      // Enhanced movie object with classifications
      movie.classification = {
        primaryGenre: movie.genres[0] || 'Unknown',
        ratingCategory: ratingCategory,
        movieType: getMovieType(movie.release_year),
        contentType: getContentType(movie),
        decade: decadeLabel,
        popularityLevel: getPopularityLevel(movie.total_ratings)
      };
    });
    
    // Save enhanced database
    fs.writeFileSync('enhanced-classified-movies.json', JSON.stringify(movies, null, 2));
    
    // Save classification metadata
    fs.writeFileSync('movie-classifications.json', JSON.stringify(classifications, null, 2));
    
    // Display statistics
    console.log('\n✅ Enhanced Movie Classification Complete!');
    console.log(`\n📊 Classification Statistics:`);
    
    console.log(`\n🎭 Genres (${Object.keys(classifications.genres).length}):`);
    Object.entries(classifications.genres)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .forEach(([genre, movieIds]) => {
        console.log(`   ${genre}: ${movieIds.length} movies`);
      });
    
    console.log(`\n🗣️ Languages (${Object.keys(classifications.languages).length}):`);
    Object.entries(classifications.languages)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .forEach(([lang, movieIds]) => {
        console.log(`   ${lang}: ${movieIds.length} movies`);
      });
    
    console.log(`\n🌍 Countries (${Object.keys(classifications.countries).length}):`);
    Object.entries(classifications.countries)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 10)
      .forEach(([country, movieIds]) => {
        console.log(`   ${country}: ${movieIds.length} movies`);
      });
    
    console.log(`\n⭐ Rating Categories:`);
    Object.entries(classifications.ratingCategories)
      .sort((a, b) => b[1].length - a[1].length)
      .forEach(([category, movieIds]) => {
        console.log(`   ${category}: ${movieIds.length} movies`);
      });
    
    console.log(`\n📅 Movie Types:`);
    Object.entries(classifications.movieTypes)
      .forEach(([type, movieIds]) => {
        console.log(`   ${type}: ${movieIds.length} movies`);
      });
    
    console.log(`\n👨‍👩‍👧‍👦 Content Types:`);
    Object.entries(classifications.contentTypes)
      .forEach(([type, movieIds]) => {
        console.log(`   ${type}: ${movieIds.length} movies`);
      });
    
    return { movies, classifications };
    
  } catch (error) {
    console.error('Error enhancing movie classification:', error);
    return null;
  }
}

function getMovieType(year) {
  const currentYear = new Date().getFullYear();
  if (!year) return 'Unknown';
  if (year < 1970) return 'Classic';
  if (year < 2000) return 'Contemporary';
  if (year <= currentYear - 2) return 'Recent';
  if (year > currentYear) return 'Upcoming';
  return 'Current';
}

function getContentType(movie) {
  if (movie.adult) return 'Adult Content';
  if (movie.genres && (movie.genres.includes('Family') || movie.genres.includes('Animation'))) {
    return 'Family Friendly';
  }
  return 'Teen';
}

function getPopularityLevel(ratingCount) {
  if (!ratingCount) return 'Unknown';
  if (ratingCount >= 1000) return 'Very Popular';
  if (ratingCount >= 500) return 'Popular';
  if (ratingCount >= 100) return 'Moderately Popular';
  if (ratingCount >= 50) return 'Somewhat Popular';
  return 'Niche';
}

// Run the enhancement
enhanceMovieClassification();
