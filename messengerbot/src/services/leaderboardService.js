const fs = require('fs');
const path = require('path');
const messenger = require('./messengerService');
const axios = require('axios');

const LEADERBOARD_FILE = path.join(__dirname, '../../data/leaderboard.json');

// Ensure data directory exists
const dataDir = path.dirname(LEADERBOARD_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadData() {
  try {
    if (!fs.existsSync(LEADERBOARD_FILE)) return {};
    return JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

function saveData(data) {
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(data, null, 2));
}

/**
 * Add or update a user's score after a quiz
 */
async function addScore(senderId, score, topic) {
  const data = loadData();

  if (!data[senderId]) {
    data[senderId] = {
      id: senderId,
      name: await getUserName(senderId),
      totalScore: 0,
      gamesPlayed: 0,
      bestScore: 0,
    };
  }

  data[senderId].totalScore += score;
  data[senderId].gamesPlayed += 1;
  data[senderId].bestScore = Math.max(data[senderId].bestScore, score);

  saveData(data);
  console.log(`🏆 Score saved: ${senderId} +${score} (${topic})`);
}

/**
 * Send formatted leaderboard
 */
async function sendLeaderboard(senderId) {
  const data = loadData();
  const entries = Object.values(data);

  if (entries.length === 0) {
    await messenger.sendText(senderId,
      `🏆 *Leaderboard is empty!*\n\nBe the first to score! Type *#quiz* to start.`
    );
    return;
  }

  // Sort by total score
  entries.sort((a, b) => b.totalScore - a.totalScore);

  const medals = ['🥇', '🥈', '🥉'];
  const lines = entries.slice(0, 10).map((entry, i) => {
    const medal = medals[i] || `${i + 1}.`;
    const avg = entry.gamesPlayed > 0
      ? (entry.totalScore / entry.gamesPlayed).toFixed(1)
      : '0';
    return `${medal} *${entry.name || 'Player'}* — ${entry.totalScore} pts (avg ${avg}/5, ${entry.gamesPlayed} games)`;
  });

  // Highlight current user's rank
  const userRank = entries.findIndex(e => e.id === senderId) + 1;
  const userEntry = data[senderId];
  const userLine = userEntry
    ? `\n📍 *Your rank: #${userRank}* — ${userEntry.totalScore} pts`
    : '';

  await messenger.sendText(senderId,
    `🏆 *Music Quiz Leaderboard*\n\n${lines.join('\n')}${userLine}\n\n🧠 Play more with *#quiz*!`
  );
}

/**
 * Fetch user's first name from Facebook Graph API
 */
async function getUserName(senderId) {
  try {
    const res = await axios.get(
      `https://graph.facebook.com/${senderId}`,
      { params: { fields: 'first_name', access_token: process.env.PAGE_ACCESS_TOKEN } }
    );
    return res.data.first_name || 'Player';
  } catch {
    return 'Player';
  }
}

module.exports = { addScore, sendLeaderboard };
