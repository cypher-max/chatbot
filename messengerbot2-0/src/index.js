require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { handleMessage } = require('./handlers/messageHandler');

const app = express();
app.use(bodyParser.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'my_messenger_bot_token';

// Webhook verification
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ Webhook verified!');
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// Track recently-seen message IDs to ignore Facebook's retried webhook
// deliveries (Facebook resends an event if it doesn't get a fast enough
// response, which would otherwise make the bot process #sing etc. twice).
const seenMessageIds = new Set();
const SEEN_ID_TTL_MS = 5 * 60 * 1000; // forget IDs after 5 minutes

function rememberMessageId(id) {
  seenMessageIds.add(id);
  setTimeout(() => seenMessageIds.delete(id), SEEN_ID_TTL_MS);
}

// Receive messages
app.post('/webhook', (req, res) => {
  const body = req.body;

  // Acknowledge immediately — don't make Facebook wait on song downloads,
  // AI quiz generation, etc. Facebook treats a slow response as a failed
  // delivery and retries the same event, which causes duplicate replies.
  res.status(200).send('EVENT_RECEIVED');

  if (body.object !== 'page') return;

  for (const entry of body.entry) {
    for (const event of entry.messaging) {
      if (!event.message) continue;

      const messageId = event.message.mid;
      if (messageId) {
        if (seenMessageIds.has(messageId)) {
          console.log(`⏭️  Skipping duplicate delivery of message ${messageId}`);
          continue;
        }
        rememberMessageId(messageId);
      }

      // Fire-and-forget — errors are already handled/logged inside handleMessage
      handleMessage(event).catch(err => console.error('❌ handleMessage error:', err));
    }
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🎵 MusicBot is running on port ${PORT}`);
  console.log(`📡 Webhook URL: http://your-domain.com/webhook`);
});
