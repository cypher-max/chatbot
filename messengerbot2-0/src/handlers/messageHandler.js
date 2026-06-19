const messenger = require('../services/messengerService');
const songService = require('../services/songService');
const quizService = require('../services/quizService');
const lyricsService = require('../services/lyricsService');
const triviaService = require('../services/triviaService');
const leaderboard = require('../services/leaderboardService');

async function handleMessage(event) {
  const senderId = event.sender.id;
  const text = (event.message.text || '').trim();

  console.log(`📨 Message from ${senderId}: ${text}`);

  // #sing [song name]
  if (text.toLowerCase().startsWith('#sing ')) {
    const songName = text.slice(6).trim();
    await messenger.sendText(senderId, `🎵 Searching for "${songName}"...`);
    await songService.handleSing(senderId, songName);

  // #lyrics [song name]
  } else if (text.toLowerCase().startsWith('#lyrics ')) {
    const songName = text.slice(8).trim();
    await messenger.sendText(senderId, `📜 Fetching lyrics for "${songName}"...`);
    await lyricsService.handleLyrics(senderId, songName);

  // #quiz [optional topic] — random topic if none given
  } else if (text.toLowerCase().startsWith('#quiz')) {
    const topic = text.slice(5).trim(); // empty string if none given
    await quizService.startQuiz(senderId, topic);

  // #answer [A/B/C/D] — answer a quiz question
  } else if (text.toLowerCase().startsWith('#answer ')) {
    const answer = text.slice(8).trim().toUpperCase();
    await quizService.handleAnswer(senderId, answer);

  // #trivia [optional topic] — random topic if none given
  } else if (text.toLowerCase().startsWith('#trivia')) {
    const topic = text.slice(7).trim(); // empty string if none given
    await triviaService.sendTrivia(senderId, topic);

  // #leaderboard
  } else if (text.toLowerCase() === '#leaderboard') {
    await leaderboard.sendLeaderboard(senderId);

  // #help
  } else if (text.toLowerCase() === '#help' || text.toLowerCase() === 'help') {
    await sendHelp(senderId);

  // Unknown command
  } else if (text.startsWith('#')) {
    await messenger.sendText(senderId, `❓ Unknown command. Type #help to see all commands.`);

  } else {
    await sendWelcome(senderId);
  }
}

async function sendHelp(senderId) {
  const helpText =
    `🎶 *MusicBot Commands*\n\n` +
    `🎵 *#sing [song name]*\n   Sends a song as a voice message\n\n` +
    `📜 *#lyrics [song name]*\n   Get the full lyrics\n\n` +
    `🧠 *#quiz [topic]*\n   Start a quiz — any topic, or random if left blank\n\n` +
    `✅ *#answer [A/B/C/D]*\n   Answer the current quiz question\n\n` +
    `🎲 *#trivia [topic]*\n   Get a fact — any topic, or random if left blank\n\n` +
    `🏆 *#leaderboard*\n   See the top quiz scorers\n\n` +
    `💡 Examples:\n   #sing Bohemian Rhapsody\n   #lyrics Blinding Lights\n   #quiz space exploration\n   #trivia (random topic)`;
  await messenger.sendText(senderId, helpText);
}

async function sendWelcome(senderId) {
  await messenger.sendText(
    senderId,
    `👋 Hey! I'm *MusicBot* 🎵\n\nType *#help* to see everything I can do!\n\nQuick start: Try *#sing [song name]* or *#trivia*`
  );
}

module.exports = { handleMessage };
