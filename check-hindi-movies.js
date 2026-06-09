const fs = require('fs');

try {
  const data = JSON.parse(fs.readFileSync('./ultimate-movie-database.json', 'utf8'));
  const hindiMovies = data.filter(m => m.language === 'Hindi');
  
  console.log('Hindi movies found:', hindiMovies.length);
  console.log('\nFirst 10 Hindi movies:');
  hindiMovies.slice(0, 10).forEach((m, i) => {
    console.log(`${i+1}. ${m.title} (${m.release_year}) - Rating: ${m.avg_rating}`);
  });
  
  console.log('\nChecking language field values:');
  const languages = [...new Set(data.map(m => m.language))];
  console.log('All languages in database:', languages.slice(0, 20));
  
  // Check for case sensitivity issues
  const hindiVariations = data.filter(m => 
    m.language && m.language.toLowerCase().includes('hindi')
  );
  console.log('\nMovies with "hindi" in language (case insensitive):', hindiVariations.length);
  hindiVariations.slice(0, 5).forEach(m => {
    console.log(`- ${m.title}: "${m.language}"`);
  });
  
} catch (error) {
  console.error('Error:', error.message);
}
