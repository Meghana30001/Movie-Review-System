const { spawn } = require('child_process');
const path = require('path');

const root = __dirname;
const node = process.execPath;

function startBackend() {
  return spawn(node, ['ultimate-movie-server.js'], {
    cwd: root,
    env: { ...process.env, PORT: '5000', API_ONLY: '1' },
    stdio: 'inherit'
  });
}

function startFrontend() {
  return spawn(node, ['server.js'], {
    cwd: root,
    env: { ...process.env, PORT: '3000', BACKEND_PORT: '5000' },
    stdio: 'inherit'
  });
}

const backend = startBackend();

setTimeout(() => {
  const frontend = startFrontend();

  frontend.on('exit', (code) => {
    backend.kill();
    process.exit(code ?? 0);
  });
}, 1200);

backend.on('exit', (code) => {
  if (code && code !== 0) process.exit(code);
});

process.on('SIGINT', () => {
  backend.kill();
  process.exit(0);
});

console.log('Starting CineMatch (frontend :3000 + backend :5000)...');
