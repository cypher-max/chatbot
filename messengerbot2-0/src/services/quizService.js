const messenger = require('./messengerService');
const leaderboard = require('./leaderboardService');

// In-memory quiz sessions: { senderId: { question, answer, topic, score, round } }
const sessions = {};

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
 * Start a quiz session. `topic` may be an empty string, in which case a
 * random topic is chosen from DEFAULT_TOPICS.
 */
async function startQuiz(senderId, topic) {
  const chosenTopic = topic && topic.trim()
    ? topic.trim()
    : DEFAULT_TOPICS[Math.floor(Math.random() * DEFAULT_TOPICS.length)];

  // Reset session
  sessions[senderId] = {
    topic: chosenTopic,
    score: 0,
    round: 1,
    question: null,
    answer: null,
  };

  await messenger.sendText(senderId, `🧠 *Quiz: ${chosenTopic}*\nRound 1 of 5 — Let's go!\n\nType *#answer A/B/C/D* to answer.`);
  await sendQuestion(senderId);
}

/**
 * Generate and send a question via Claude AI
 */
async function sendQuestion(senderId) {
  const session = sessions[senderId];
  if (!session) return;

  await messenger.sendText(senderId, `⏳ Generating question ${session.round}/5...`);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Generate a trivia question about "${session.topic}".
Respond ONLY with valid JSON, no markdown, no explanation:
{
  "question": "The question text",
  "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
  "answer": "A",
  "fact": "Interesting fact about the answer (1 sentence)"
}`
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

    const raw = data.content?.[0]?.text?.trim() || '';
    if (!raw) throw new Error('Empty response from API: ' + JSON.stringify(data));

    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);

    session.question = parsed.question;
    session.answer = parsed.answer;
    session.fact = parsed.fact;

    const text =
      `❓ *Q${session.round}:* ${parsed.question}\n\n` +
      `🅰️  ${parsed.options.A}\n` +
      `🅱️  ${parsed.options.B}\n` +
      `🅲  ${parsed.options.C}\n` +
      `🅳  ${parsed.options.D}\n\n` +
      `Reply with *#answer A*, *#answer B*, *#answer C*, or *#answer D*`;

    await messenger.sendText(senderId, text);

  } catch (err) {
    // Log the FULL real error so failures are diagnosable in Render logs.
    console.error('❌ Quiz question error:', err.message);
    await messenger.sendText(senderId, `⚠️ Couldn't generate a question right now (AI service issue — check Render logs). Type *#quiz* to try again.`);
    delete sessions[senderId];
  }
}

/**
 * Handle a quiz answer
 */
async function handleAnswer(senderId, answer) {
  const session = sessions[senderId];

  if (!session || !session.answer) {
    await messenger.sendText(senderId, `❓ No active quiz! Start one with *#quiz* or *#quiz [topic]*`);
    return;
  }

  if (!['A', 'B', 'C', 'D'].includes(answer)) {
    await messenger.sendText(senderId, `⚠️ Please answer with A, B, C, or D.\nExample: *#answer B*`);
    return;
  }

  const correct = answer === session.answer;

  if (correct) {
    session.score++;
    await messenger.sendText(senderId,
      `✅ *Correct!* +1 point\n💡 ${session.fact}\n\n📊 Score: ${session.score}/${session.round}`
    );
  } else {
    await messenger.sendText(senderId,
      `❌ *Wrong!* The answer was *${session.answer}*\n💡 ${session.fact}\n\n📊 Score: ${session.score}/${session.round}`
    );
  }

  session.round++;
  session.question = null;
  session.answer = null;

  if (session.round > 5) {
    // Quiz over
    const finalScore = session.score;
    const topic = session.topic;
    delete sessions[senderId];

    const rating = finalScore >= 4 ? '🏆 Excellent!' : finalScore >= 2 ? '👍 Good job!' : '📚 Keep learning!';
    await messenger.sendText(senderId,
      `🎉 *Quiz Complete!*\n\nFinal Score: *${finalScore}/5*\n${rating}\n\nYour score has been added to the leaderboard!\nType *#leaderboard* to see rankings.\nType *#quiz* to play again!`
    );

    await leaderboard.addScore(senderId, finalScore, topic);
  } else {
    await sleep(1000);
    await sendQuestion(senderId);
  }
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { startQuiz, handleAnswer };
