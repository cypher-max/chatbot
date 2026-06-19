// Launches the PO Token Provider server and the bot together.
// Using plain Node here (instead of a shell script) avoids any
// shell-compatibility issues between bash/dash/sh across base images.
const { spawn } = require('child_process');

function run(label, command, args) {
  const proc = spawn(command, args, { stdio: 'inherit' });

  proc.on('exit', (code) => {
    console.log(`⚠️  ${label} exited with code ${code} — shutting down container.`);
    // If either process dies, bring the whole container down so the
    // platform (Render, etc.) restarts it cleanly.
    process.exit(code === null ? 1 : code);
  });

  proc.on('error', (err) => {
    console.error(`❌ ${label} failed to start:`, err.message);
    process.exit(1);
  });

  return proc;
}

console.log('🔑 Starting PO Token Provider server on port 4416...');
run('PO Token Provider', 'node', ['/opt/bgutil-provider/server/build/main.js']);

// Give the provider a moment to bind its port before the bot starts
// making requests against it.
setTimeout(() => {
  console.log('🤖 Starting MusicBot...');
  run('MusicBot', 'node', ['src/index.js']);
}, 2000);
