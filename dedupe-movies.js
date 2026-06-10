const mysql = require('mysql2/promise');
const { poolConfig } = require('./db-config');

async function main() {
  const conn = await mysql.createConnection(poolConfig);
  console.log(`Connected to ${poolConfig.database}`);

  const [dupes] = await conn.query(`
    SELECT LOWER(TRIM(title)) AS title_key, IFNULL(release_year, 0) AS year_key,
           GROUP_CONCAT(movie_id ORDER BY
             (poster_url IS NOT NULL AND poster_url LIKE 'http%') DESC,
             total_ratings DESC,
             avg_rating DESC,
             movie_id ASC
           ) AS ids,
           COUNT(*) AS copies
    FROM Movies
    GROUP BY title_key, year_key
    HAVING copies > 1
  `);

  if (!dupes.length) {
    console.log('No duplicate movies found.');
    await conn.end();
    return;
  }

  let removed = 0;
  for (const row of dupes) {
    const ids = row.ids.split(',').map(Number);
    const keepId = ids[0];
    const deleteIds = ids.slice(1);
    if (!deleteIds.length) continue;
    await conn.query('DELETE FROM Movies WHERE movie_id IN (?)', [deleteIds]);
    removed += deleteIds.length;
    console.log(`Kept ${keepId}, removed ${deleteIds.length} duplicate(s) of "${row.title_key}" (${row.year_key})`);
  }

  console.log(`Done. Removed ${removed} duplicate movie row(s).`);
  await conn.end();
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
