#!/bin/sh
set -e

echo "🔑 Starting PO Token Provider server on port 4416..."
node /opt/bgutil-provider/server/build/main.js &
POT_PID=$!

# Give it a moment to bind its port before the bot starts making requests
sleep 2

echo "🤖 Starting MusicBot..."
node src/index.js &
BOT_PID=$!

# If either process dies, bring the whole container down so Render restarts it
wait -n $POT_PID $BOT_PID
exit $?
