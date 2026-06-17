#!/bin/bash
set -e

echo "🔑 Starting PO Token Provider server on port 4416..."
node /opt/bgutil-provider/server/build/main.js &
POT_PID=$!

# Give it a moment to bind its port before the bot starts making requests
sleep 2

echo "🤖 Starting MusicBot..."
node src/index.js &
BOT_PID=$!

# If either process exits, bring the whole container down so Render
# restarts it. `wait -n` (wait for whichever PID finishes first) is a
# bash-only feature — this script must run under bash, not /bin/sh
# (which is dash on Debian and doesn't support -n).
wait -n "$POT_PID" "$BOT_PID"
EXIT_CODE=$?

echo "⚠️  One of the processes exited (code $EXIT_CODE) — shutting down container."
exit $EXIT_CODE
