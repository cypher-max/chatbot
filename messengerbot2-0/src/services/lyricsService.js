const axios = require('axios');
const messenger = require('./messengerService');

/**
 * Handle #lyrics [song name]
 * Uses lyrics.ovh (free) and falls back to Claude AI for well-known songs
 */
async function handleLyrics(senderId, songName) {
  // Try to split "Song by Artist" or "Song - Artist"
  let artist = '';
  let title = songName;

  const byMatch = songName.match(/^(.+?)\s+by\s+(.+)$/i);
  const dashMatch = songName.match(/^(.+?)\s*[-–]\s*(.+)$/);

  if (byMatch) {
    title = byMatch[1].trim();
    artist = byMatch[2].trim();
  } else if (dashMatch) {
    title = dashMatch[1].trim();
    artist = dashMatch[2].trim();
  }

  try {
    let lyrics = null;

    // Try lyrics.ovh API (free, no key required)
    if (artist) {
      const url = `https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`;
      const res = await axios.get(url, { timeout: 8000 });
      if (res.data?.lyrics) {
        lyrics = res.data.lyrics.trim();
      }
    }

    if (!lyrics) {
      // Fallback: ask Claude API to provide well-known lyrics excerpt
      lyrics = await getLyricsFromClaude(songName);
    }

    if (!lyrics) {
      await messenger.sendText(senderId,
        `❌ Couldn't find lyrics for "${songName}".\nTip: Format it as *#lyrics Song Name by Artist*\nExample: *#lyrics Bohemian Rhapsody by Queen*`
      );
      return;
    }

    // Split into chunks (Facebook text limit: 2000 chars)
    const chunks = splitIntoChunks(`📜 *${songName}*\n\n${lyrics}`, 1800);
    for (const chunk of chunks) {
      await messenger.sendText(senderId, chunk);
      await sleep(500);
    }

  } catch (err) {
    console.error('❌ Lyrics error:', err.message);
    await messenger.sendText(senderId,
      `❌ Couldn't fetch lyrics. Try: *#lyrics Song by Artist*`
    );
  }
}

async function getLyricsFromClaude(songName) {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Provide the first two verses and chorus of the song "${songName}". 
If you know this song, provide the actual lyrics excerpt. 
If you don't know it or it's not a real song, respond with exactly: NOT_FOUND
Do not add any explanation, just the lyrics or NOT_FOUND.`
        }]
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`❌ Claude lyrics fallback — API responded ${res.status}: ${errBody}`);
      return null;
    }

    const data = await res.json();

    if (data.error) {
      console.error(`❌ Claude lyrics fallback — API error: ${data.error.type} - ${data.error.message}`);
      return null;
    }

    const text = data.content?.[0]?.text?.trim();
    return (text && text !== 'NOT_FOUND') ? text : null;
  } catch (err) {
    // Previously this was a silent empty catch — now logged so failures
    // are actually diagnosable in Render logs.
    console.error('❌ Claude lyrics fallback error:', err.message);
    return null;
  }
}

function splitIntoChunks(text, maxLen) {
  const chunks = [];
  let i = 0;
  while (i < text.length) {
    chunks.push(text.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

module.exports = { handleLyrics };
