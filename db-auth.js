const crypto = require('crypto');

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const iterations = 600000;
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return `pbkdf2:sha256:${iterations}$${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;

  if (stored.startsWith('hash_')) {
    return stored === `hash_${Buffer.from(password).toString('base64')}`;
  }

  if (!stored.startsWith('pbkdf2:sha256:')) return false;

  const parts = stored.split('$');
  if (parts.length !== 3) return false;

  const iterations = parseInt(parts[0].split(':')[2], 10);
  const salt = parts[1];
  const expected = parts[2];
  const hash = crypto.pbkdf2Sync(password, salt, iterations, 32, 'sha256').toString('hex');
  return hash === expected;
}

module.exports = { hashPassword, verifyPassword };
