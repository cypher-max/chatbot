const messenger = require('./messengerService');

const TRIVIA_CATEGORIES = [
  'pop music history',
  'rock legends',
  'hip hop origins',
  'classical music',
  'famous music videos',
  'record-breaking albums',
  'music production techniques',
  'iconic concert moments',
  'band formations and breakups',
  'music awards surprises',
];

/**
 * Handle #trivia — sends a random music fact
 */
async function sendTrivia(senderId) {
  const category = TRIVIA_CATEGORIES[Math.floor(Math.random() * TRIVIA_CATEGORIES.length)];

  await messenger.sendText(senderId, `🎲 Getting a trivia fact about *${category}*...`);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Give me one fascinating and surprising music trivia fact about: ${category}.
Make it engaging and fun. Keep it to 2-3 sentences max.
Start with an emoji that fits the fact. Do not use markdown headers.`
        }]
      })
    });

    const data = await res.json();
    const fact = data.content?.[0]?.text?.trim();

    if (!fact) throw new Error('Empty response');

    await messenger.sendText(senderId,
      `🎵 *Music Trivia!*\n\n${fact}\n\n💬 Want more? Type *#trivia* again!\n🧠 Ready to test yourself? Type *#quiz*`
    );

  } catch (err) {
    console.error('❌ Trivia error:', err.message);
    await messenger.sendText(senderId,
      `🎵 *Fun Fact:* The world's longest officially released song is "Longplayer" by Jem Finer — it's designed to play for 1,000 years without repeating!\n\n💬 Type *#trivia* for another!`
    );
  }
}

module.exports = { sendTrivia };
