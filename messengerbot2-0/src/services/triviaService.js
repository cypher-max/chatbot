const messenger = require('./messengerService');

// Broad, varied default topics — used when the user doesn't specify one.
// Not limited to music anymore.
const DEFAULT_TOPICS = [
  'space exploration',
  'ancient history',
  'ocean life',
  'world geography',
  'famous inventions',
  'animal behavior',
  'food and cooking history',
  'sports records',
  'movies and film history',
  'music history',
  'science and physics',
  'language and etymology',
  'video game history',
  'art and architecture',
  'unusual world records',
];

/**
 * Handle #trivia or #trivia [topic]
 * Sends a random fact — about a user-specified topic if given,
 * otherwise a random topic from a broad, varied list.
 */
async function sendTrivia(senderId, topic) {
  const chosenTopic = topic && topic.trim()
    ? topic.trim()
    : DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];

  await messenger.sendText(senderId, `🎲 Getting a trivia fact about *${chosenTopic}*...`);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Give me one fascinating and surprising trivia fact about: ${chosenTopic}.
Make it engaging and fun. Keep it to 2-3 sentences max.
Start with an emoji that fits the fact. Do not use markdown headers.`
        }]
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`API responded ${res.status}: ${errBody}`);
    }

    const data = await res.json();

    if (data.error) {
      throw new Error(`API error: ${data.error.type} - ${data.error.message}`);
    }

    const fact = data.content?.[0]?.text?.trim();
    if (!fact) throw new Error('Empty response from API: ' + JSON.stringify(data));

    await messenger.sendText(senderId,
      `🎲 *Trivia: ${chosenTopic}*\n\n${fact}\n\n💬 Want more? Type *#trivia* for a random topic, or *#trivia [topic]* for something specific!\n🧠 Ready to test yourself? Type *#quiz [topic]*`
    );

  } catch (err) {
    // Log the FULL real error so it shows up in Render logs — without this,
    // every failure silently looks identical (the same fallback fact below).
    console.error('❌ Trivia error:', err.message);
    await messenger.sendText(senderId,
      `⚠️ Couldn't generate trivia right now (AI service issue — check Render logs for details). Try again in a moment, or try *#trivia [a different topic]*.`
    );
  }
}

module.exports = { sendTrivia };
