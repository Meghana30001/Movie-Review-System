const MOOD_PROFILES = {
  happy: {
    genres: ['Comedy', 'Musical', 'Animation', 'Family'],
    keywords: ['joy', 'laugh', 'fun', 'celebrate', 'uplifting', 'heartwarming', 'friendship', 'cheerful', 'comedy', 'humor', 'wedding', 'festival', 'dance', 'party', 'bright'],
    exclude: ['Horror', 'Crime', 'War', 'Thriller']
  },
  cheerful: {
    genres: ['Comedy', 'Musical', 'Animation', 'Family'],
    keywords: ['joy', 'celebration', 'happiness', 'fun', 'festive', 'bright', 'colorful', 'laugh', 'dance'],
    exclude: ['Horror', 'Thriller', 'Crime', 'War']
  },
  sad: {
    genres: ['Drama'],
    keywords: ['loss', 'death', 'grief', 'tears', 'emotional', 'tragic', 'heartbreak', 'separation', 'farewell', 'sacrifice', 'struggle', 'suffering', 'lonely', 'sorrow', 'pain'],
    exclude: ['Comedy', 'Animation', 'Action', 'Musical']
  },
  melancholy: {
    genres: ['Drama', 'Romance'],
    keywords: ['sorrow', 'loss', 'memory', 'rain', 'bittersweet', 'longing', 'alone', 'farewell', 'regret', 'past'],
    exclude: ['Action', 'Comedy', 'Animation']
  },
  excited: {
    genres: ['Action', 'Adventure', 'Sci-Fi', 'Science Fiction'],
    keywords: ['chase', 'battle', 'explosion', 'hero', 'mission', 'fight', 'power', 'epic', 'warrior', 'speed', 'adrenaline', 'intense'],
    exclude: ['Drama', 'Romance', 'Family']
  },
  thrilled: {
    genres: ['Action', 'Thriller'],
    keywords: ['intense', 'edge', 'breathtaking', 'adrenaline', 'danger', 'suspense', 'climax', 'explosive'],
    exclude: ['Romance', 'Family', 'Animation']
  },
  scared: {
    genres: ['Horror', 'Thriller'],
    keywords: ['ghost', 'haunted', 'murder', 'dark', 'death', 'fear', 'terror', 'supernatural', 'killer', 'suspense', 'creepy', 'evil', 'demon', 'curse', 'horror', 'nightmare'],
    exclude: ['Comedy', 'Animation', 'Family', 'Musical', 'Romance', 'Biography']
  },
  spooky: {
    genres: ['Horror', 'Thriller', 'Mystery'],
    keywords: ['ghost', 'haunted', 'paranormal', 'curse', 'demon', 'evil', 'supernatural', 'possession', 'nightmare'],
    exclude: ['Comedy', 'Romance', 'Family', 'Musical']
  },
  romantic: {
    genres: ['Romance'],
    keywords: ['love', 'romance', 'couple', 'relationship', 'heart', 'passion', 'wedding', 'marriage', 'dating', 'soulmate', 'kiss', 'destiny', 'together'],
    exclude: ['Horror', 'Crime', 'War', 'Action']
  },
  love: {
    genres: ['Romance', 'Drama'],
    keywords: ['love', 'romance', 'couple', 'heart', 'passion', 'wedding', 'relationship', 'devotion', 'eternal'],
    exclude: ['Horror', 'Crime', 'War']
  },
  adventurous: {
    genres: ['Adventure', 'Action', 'Fantasy', 'Sci-Fi', 'Science Fiction'],
    keywords: ['journey', 'quest', 'explore', 'discover', 'treasure', 'world', 'hero', 'epic', 'kingdom', 'space', 'expedition', 'survival'],
    exclude: ['Romance', 'Horror']
  },
  relaxed: {
    genres: ['Comedy', 'Animation', 'Family'],
    keywords: ['peaceful', 'calm', 'gentle', 'nature', 'simple', 'life', 'village', 'countryside', 'friendship', 'warm', 'cozy', 'sweet'],
    exclude: ['Horror', 'Thriller', 'Action', 'Crime', 'War']
  },
  chill: {
    genres: ['Comedy', 'Animation', 'Family'],
    keywords: ['relax', 'easy', 'lighthearted', 'fun', 'casual', 'simple', 'feel-good'],
    exclude: ['Horror', 'Thriller', 'Action', 'Crime']
  },
  angry: {
    genres: ['Action', 'Crime', 'Thriller'],
    keywords: ['revenge', 'justice', 'fight', 'battle', 'war', 'rebel', 'rage', 'destroy', 'confront', 'vendetta', 'betrayal', 'fury'],
    exclude: ['Romance', 'Comedy', 'Animation', 'Family', 'Musical']
  },
  frustrated: {
    genres: ['Action', 'Thriller', 'Crime'],
    keywords: ['revenge', 'fight', 'struggle', 'overcome', 'justice', 'against', 'rebel'],
    exclude: ['Romance', 'Comedy', 'Animation', 'Family']
  },
  bored: {
    genres: ['Adventure', 'Action', 'Comedy', 'Sci-Fi', 'Science Fiction', 'Fantasy'],
    keywords: ['epic', 'amazing', 'incredible', 'spectacular', 'blockbuster', 'thrilling', 'exciting', 'mind-blowing'],
    exclude: []
  },
  nostalgic: {
    genres: ['Drama', 'Family', 'Animation'],
    keywords: ['childhood', 'memory', 'past', 'growing up', 'home', 'family', 'classic', 'tradition', 'heritage', 'remember', 'old', 'youth', 'school'],
    exclude: ['Horror', 'Crime', 'Thriller']
  },
  curious: {
    genres: ['Mystery', 'Sci-Fi', 'Science Fiction', 'Thriller'],
    keywords: ['mystery', 'investigation', 'discover', 'secret', 'puzzle', 'detective', 'clue', 'conspiracy', 'unknown', 'truth', 'riddle', 'experiment'],
    exclude: ['Comedy', 'Musical', 'Family']
  },
  energetic: {
    genres: ['Action', 'Adventure', 'Musical'],
    keywords: ['dance', 'fight', 'race', 'competition', 'battle', 'sport', 'energy', 'music', 'party', 'champion', 'power'],
    exclude: ['Drama', 'Horror']
  },
  lonely: {
    genres: ['Romance', 'Drama'],
    keywords: ['love', 'friendship', 'connection', 'relationship', 'companion', 'together', 'bond', 'meet', 'stranger'],
    exclude: ['Horror', 'War', 'Crime']
  },
  inspired: {
    genres: ['Drama', 'Biography'],
    keywords: ['dream', 'achieve', 'overcome', 'success', 'struggle', 'triumph', 'hero', 'journey', 'inspiring', 'hope', 'rise', 'change', 'courage'],
    exclude: ['Horror', 'Crime', 'Thriller']
  },
  motivated: {
    genres: ['Drama', 'Action', 'Adventure', 'Biography'],
    keywords: ['champion', 'winner', 'train', 'overcome', 'achieve', 'goal', 'rise', 'fight', 'determination', 'never give up', 'victory'],
    exclude: ['Horror']
  },
  dark: {
    genres: ['Horror', 'Thriller', 'Crime', 'Mystery'],
    keywords: ['dark', 'death', 'murder', 'evil', 'sinister', 'twisted', 'psychological', 'nightmare', 'corrupt', 'shadow'],
    exclude: ['Comedy', 'Animation', 'Family', 'Musical']
  },
  funny: {
    genres: ['Comedy', 'Animation'],
    keywords: ['funny', 'hilarious', 'comedy', 'laugh', 'humor', 'comic', 'silly', 'parody', 'satire', 'prank', 'joke', 'witty'],
    exclude: ['Horror', 'Crime', 'Thriller', 'War']
  },
  tense: {
    genres: ['Thriller', 'Mystery', 'Crime'],
    keywords: ['suspense', 'tension', 'nerve', 'edge', 'twist', 'chase', 'escape', 'trapped', 'danger', 'stakes', 'countdown'],
    exclude: ['Comedy', 'Animation', 'Family', 'Musical']
  },
  peaceful: {
    genres: ['Drama', 'Animation', 'Family'],
    keywords: ['nature', 'calm', 'serene', 'quiet', 'gentle', 'beautiful', 'meditative', 'spiritual', 'garden', 'mountain'],
    exclude: ['Action', 'Horror', 'Thriller', 'Crime', 'War']
  }
};

function getMoodProfile(moodInput) {
  const mood = (moodInput || '').toLowerCase().trim();
  for (const [key, profile] of Object.entries(MOOD_PROFILES)) {
    if (mood === key || mood.includes(key) || key.includes(mood)) return { key, profile };
  }
  return { key: 'default', profile: { genres: ['Drama', 'Comedy', 'Action', 'Romance'], keywords: [], exclude: [] } };
}

function scoreMovieForMood(movie, profile, moodKey = '') {
  const genres = movie.genres || [];
  if (genres.some(g => profile.exclude.includes(g))) return 0;

  let score = 0;
  const synopsis = (movie.synopsis || '').toLowerCase();
  const title = (movie.title || '').toLowerCase();

  score += genres.filter(g => profile.genres.includes(g)).length * 3;

  for (const kw of profile.keywords) {
    if (synopsis.includes(kw)) score += 2;
    if (title.includes(kw)) score += 1;
  }

  score += parseFloat(movie.avg_rating) || 0;

  const hasPreferredGenre = genres.some(g => profile.genres.includes(g));
  if (profile.genres.length && !hasPreferredGenre) return 0;

  // Scared/spooky: thriller-only titles need horror signals
  if (['scared', 'spooky'].includes(moodKey)) {
    const hasHorror = genres.includes('Horror');
    const hasThriller = genres.includes('Thriller');
    if (hasThriller && !hasHorror) {
      const horrorSignal = profile.keywords.some(kw => synopsis.includes(kw) || title.includes(kw));
      if (!horrorSignal) return 0;
    }
    if (hasHorror) score += 4;
  }

  // Happy/relaxed: penalize heavy crime or drama without comedy signals
  if (['happy', 'cheerful', 'relaxed', 'chill'].includes(moodKey)) {
    if (genres.includes('Crime') || genres.includes('War')) return 0;
  }

  // Romantic: must have Romance genre
  if (['romantic', 'love'].includes(moodKey) && !genres.includes('Romance')) return 0;

  return score > 2 ? score : 0;
}

module.exports = { MOOD_PROFILES, getMoodProfile, scoreMovieForMood };
