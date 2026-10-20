const { spawn } = require('child_process');
const path = require('path');

console.log('\x1b[36m%s\x1b[0m', '==================================================');
console.log('\x1b[36m%s\x1b[0m', 'Starting Collaborative Research Ecosystem...');
console.log('\x1b[36m%s\x1b[0m', 'Backend:  http://localhost:5000 (API & Health)');
console.log('\x1b[36m%s\x1b[0m', 'Frontend: http://localhost:3000 (Web Application)');
console.log('\x1b[36m%s\x1b[0m', '==================================================\n');

// 1. Spawn Backend
const backend = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, 'backend'),
  stdio: 'inherit',
  shell: true
});

// 2. Spawn Frontend
const frontend = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
  cwd: path.join(__dirname, 'frontend'),
  stdio: 'inherit',
  shell: true
});

const cleanup = () => {
  console.log('\nShutting down servers...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
