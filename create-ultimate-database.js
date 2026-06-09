const fs = require('fs');

function createUltimateMovieDatabase() {
  try {
    // Load all movie databases
    let worldMovies = [];
    let indianAllLanguages = [];
    
    // Load worldwide movies
    try {
      const worldData = fs.readFileSync('./world-movies-database.json', 'utf8');
      worldMovies = JSON.parse(worldData);
      console.log(`Loaded ${worldMovies.length} worldwide movies`);
    } catch (error) {
      console.log('Error loading world movies:', error.message);
    }

    // Load Indian all-language movies
    try {
      const indianData = fs.readFileSync('./indian-all-languages.json', 'utf8');
      indianAllLanguages = JSON.parse(indianData);
      console.log(`Loaded ${indianAllLanguages.length} Indian movies (all languages)`);
    } catch (error) {
      console.log('Error loading Indian movies:', error.message);
    }

    // Remove duplicate Indian movies from worldMovies (keep the all-language version)
    const indianMovieIds = new Set(indianAllLanguages.map(m => m.movie_id));
    const filteredWorldMovies = worldMovies.filter(m => 
      m.country !== 'India' || !indianMovieIds.has(m.movie_id)
    );

    // Combine all movies
    const allMovies = [...filteredWorldMovies, ...indianAllLanguages];
    
    // Remove any remaining duplicates based on movie_id
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

    // Create comprehensive statistics
    const stats = {
      totalMovies: uniqueMovies.length,
      countries: {},
      languages: {},
      regions: {},
      indianLanguages: {},
      indianRegions: {}
    };

    uniqueMovies.forEach(movie => {
      // Country stats
      stats.countries[movie.country] = (stats.countries[movie.country] || 0) + 1;
      
      // Language stats
      stats.languages[movie.language] = (stats.languages[movie.language] || 0) + 1;
      
      // Region stats
      stats.regions[movie.region] = (stats.regions[movie.region] || 0) + 1;
      
      // Indian specific stats
      if (movie.country === 'India') {
        stats.indianLanguages[movie.language] = (stats.indianLanguages[movie.language] || 0) + 1;
        stats.indianRegions[movie.region] = (stats.indianRegions[movie.region] || 0) + 1;
      }
    });

    // Save ultimate database
    fs.writeFileSync('ultimate-movie-database.json', JSON.stringify(uniqueMovies, null, 2));
    
    console.log(`\n✅ Ultimate Movie Database Created:`);
    console.log(`   - Total unique movies: ${uniqueMovies.length}`);
    console.log(`   - Countries represented: ${Object.keys(stats.countries).length}`);
    console.log(`   - Languages available: ${Object.keys(stats.languages).length}`);
    console.log(`   - Regions covered: ${Object.keys(stats.regions).length}`);
    console.log(`   - Indian languages: ${Object.keys(stats.indianLanguages).length}`);
    console.log(`   - Non-Indian movies: ${filteredWorldMovies.length}`);
    console.log(`   - Indian movies: ${indianAllLanguages.length}`);

    console.log(`\n🌍 Top 15 Countries by Movie Count:`);
    Object.entries(stats.countries)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([country, count]) => {
        const flag = getCountryFlag(uniqueMovies.find(m => m.country === country)?.country_code);
        console.log(`   ${flag} ${country}: ${count} movies`);
      });

    console.log(`\n🗣️ Top 15 Languages by Movie Count:`);
    Object.entries(stats.languages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([language, count]) => {
        console.log(`   ${language}: ${count} movies`);
      });

    console.log(`\n🇮🇳 Indian Languages Breakdown:`);
    Object.entries(stats.indianLanguages)
      .sort((a, b) => b[1] - a[1])
      .forEach(([language, count]) => {
        console.log(`   ${language}: ${count} movies`);
      });

    console.log(`\n🎭 Top 20 Movies Worldwide:`);
    uniqueMovies.slice(0, 20).forEach((movie, index) => {
      const flag = getCountryFlag(movie.country_code);
      const langInfo = movie.country === 'India' ? ` [${movie.language}]` : '';
      console.log(`${index + 1}. ${flag} ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5 [${movie.country}]${langInfo}`);
    });

    console.log(`\n🇮🇳 Top 15 Indian Movies (All Languages):`);
    uniqueMovies
      .filter(m => m.country === 'India')
      .slice(0, 15)
      .forEach((movie, index) => {
        console.log(`${index + 1}. 🇮🇳 ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5 [${movie.language}] [${movie.region}]`);
      });

    console.log(`\n🎬 Top Movies by Indian Language:`);
    Object.entries(stats.indianLanguages)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .forEach(([language, count]) => {
        console.log(`\n📽️ ${language} (${count} movies):`);
        uniqueMovies
          .filter(m => m.language === language)
          .slice(0, 3)
          .forEach((movie, index) => {
            console.log(`   ${index + 1}. ${movie.title} (${movie.release_year}) - ⭐ ${movie.avg_rating.toFixed(1)}/5`);
          });
      });

    return uniqueMovies;

  } catch (error) {
    console.error('Error creating ultimate database:', error);
    return [];
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

createUltimateMovieDatabase();
