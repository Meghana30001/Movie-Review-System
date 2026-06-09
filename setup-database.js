const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const { poolConfig: dbConfig } = require('./db-config');
const { hashPassword } = require('./db-auth');

async function runSqlFile(conn, filePath) {
  if (!fs.existsSync(filePath)) return;
  const sql = fs.readFileSync(filePath, 'utf8');
  const statements = sql
    .split(/;\s*[\r\n]+/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && !s.startsWith('DELIMITER'));

  for (const statement of statements) {
    if (/^USE /i.test(statement)) continue;
    try {
      await conn.query(statement);
    } catch (err) {
      if (!['ER_TABLE_EXISTS_ERROR', 'ER_DUP_ENTRY', 'ER_DUP_KEYNAME'].includes(err.code)) {
        console.warn(`Skipped: ${err.message.slice(0, 120)}`);
      }
    }
  }
}

async function main() {
  const root = __dirname;
  const bootstrap = await mysql.createConnection({
    host: dbConfig.host,
    user: dbConfig.user,
    password: dbConfig.password
  });

  await bootstrap.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.database}`);
  await bootstrap.end();

  const conn = await mysql.createConnection(dbConfig);
  console.log(`Connected to MySQL (${dbConfig.database})`);

  await runSqlFile(conn, path.join(root, 'schema.sql'));
  if (fs.existsSync(path.join(root, 'import-data-utf8.sql'))) {
    await runSqlFile(conn, path.join(root, 'import-data-utf8.sql'));
  } else {
    await runSqlFile(conn, path.join(root, 'import-data.sql'));
  }

  const users = [
    { email: 'admin@movierec.com', password: 'admin123' },
    { email: 'alice@example.com', password: 'password123' },
    { email: 'bob@example.com', password: 'password123' },
    { email: 'megh@gmail.com', password: 'test123' }
  ];

  for (const user of users) {
    const hashed = hashPassword(user.password);
    await conn.query('UPDATE Users SET password_hash = ? WHERE email = ?', [hashed, user.email]);
  }

  const [[{ movies }]] = await conn.query('SELECT COUNT(*) AS movies FROM Movies');
  const [[{ userCount }]] = await conn.query('SELECT COUNT(*) AS userCount FROM Users');
  console.log(`Database ready: ${movies} movies, ${userCount} users`);
  console.log('Login accounts:');
  console.log('  admin@movierec.com / admin123');
  console.log('  megh@gmail.com / test123');
  await conn.end();
}

main().catch(err => {
  console.error('Database setup failed:', err.message);
  process.exit(1);
});
