const poolConfig = {
  host: process.env.MYSQL_HOST || 'localhost',
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'movie_rec_db',
  waitForConnections: true,
  connectionLimit: 10
};

const INDIAN_LANGUAGES = [
  'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Kannada', 'Bengali', 'Marathi',
  'Punjabi', 'Gujarati', 'Assamese', 'Odia',
  'hi', 'ta', 'te', 'ml', 'kn', 'bn', 'mr', 'pa', 'gu', 'as', 'or'
];

// Stable display order; merges duplicate codes (e.g. hi + Hindi)
const INDIAN_LANGUAGE_GROUPS = [
  { browse: 'hi', codes: ['Hindi', 'hi'] },
  { browse: 'ta', codes: ['Tamil', 'ta'] },
  { browse: 'te', codes: ['Telugu', 'te'] },
  { browse: 'ml', codes: ['Malayalam', 'ml'] },
  { browse: 'kn', codes: ['Kannada', 'kn'] },
  { browse: 'bn', codes: ['Bengali', 'bn'] },
  { browse: 'mr', codes: ['Marathi', 'mr'] },
  { browse: 'pa', codes: ['Punjabi', 'pa'] },
  { browse: 'gu', codes: ['Gujarati', 'gu'] },
  { browse: 'as', codes: ['Assamese', 'as'] },
  { browse: 'or', codes: ['Odia', 'or'] }
];

// Fixed international list — always same languages in same order
const INTERNATIONAL_LANGUAGE_GROUPS = [
  { browse: 'zh', codes: ['zh'] },
  { browse: 'en', codes: ['en', 'English'] },
  { browse: 'fr', codes: ['fr'] },
  { browse: 'de', codes: ['de'] },
  { browse: 'it', codes: ['it'] },
  { browse: 'ja', codes: ['ja'] },
  { browse: 'ko', codes: ['ko', 'Korean'] },
  { browse: 'no', codes: ['no'] },
  { browse: 'pt', codes: ['pt'] },
  { browse: 'ru', codes: ['ru'] },
  { browse: 'es', codes: ['es'] },
  { browse: 'sv', codes: ['sv'] },
  { browse: 'th', codes: ['th'] },
  { browse: 'tr', codes: ['tr'] }
];

module.exports = {
  poolConfig,
  INDIAN_LANGUAGES,
  INDIAN_LANGUAGE_GROUPS,
  INTERNATIONAL_LANGUAGE_GROUPS
};
