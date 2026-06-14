const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const messenger = require('./messengerService');

const DOWNLOAD_DIR = path.join(__dirname, '../../data/songs');

// Ensure download directory exists
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

/**
 * Handle #sing [song name]
 * Downloads the song via yt-dlp and sends it as audio
 */
async function handleSing(senderId, songName) {
  const safeName = songName.replace(/[^a-zA-Z0-9 ]/g, '').trim();
  const outputTemplate = path.join(DOWNLOAD_DIR, `${senderId}_%(title)s.%(ext)s`);

  try {
    // yt-dlp must be installed on the server: pip install yt-dlp
    const command = [
      'yt-dlp',
      `"ytsearch1:${safeName} audio"`,  // Search YouTube
      '-x',                              // Extract audio only
      '--audio-format mp3',
      '--audio-quality 5',               // Medium quality (smaller file)
      '--max-filesize 25m',              // Facebook 25MB limit
      `--output "${outputTemplate}"`,
      '--no-playlist',
      // Forces the Android client API, which avoids the 403 Forbidden
      // errors that the default web client frequently hits.
      '--extractor-args "youtube:player_client=android"',
    ].join(' ');

    console.log(`⬇️  Downloading: ${safeName}`);
    // stdio: 'pipe' captures yt-dlp's real output so errors aren't silently
    // swallowed — execSync throws with stderr attached on non-zero exit.
    const stdout = execSync(command, { timeout: 60000, stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('yt-dlp stdout:', stdout.toString().slice(-1000)); // last 1000 chars

    // Debug: show everything that landed in the download dir for this sender
    const allFiles = fs.readdirSync(DOWNLOAD_DIR).filter(f => f.startsWith(senderId));
    console.log('📂 Files found for sender:', allFiles);

    // Find the downloaded mp3 file
    let files = allFiles.filter(f => f.endsWith('.mp3'));

    // Fallback: yt-dlp sometimes finishes the download but the mp3
    // post-processing step only warns (doesn't error), leaving the
    // original audio file (.webm/.m4a/.opus) instead of .mp3.
    if (files.length === 0 && allFiles.length > 0) {
      console.log('⚠️  No .mp3 found, falling back to first available file (post-processing likely failed)');
      files = allFiles;
    }

    if (files.length === 0) {
      await messenger.sendText(senderId, `❌ Sorry, I couldn't find "${songName}". Try a different name!`);
      return;
    }

    const audioPath = path.join(DOWNLOAD_DIR, files[0]);

    // Extract song title from filename
    const title = files[0]
      .replace(`${senderId}_`, '')
      .replace(/\.(mp3|webm|m4a|opus)$/, '');

    await messenger.sendText(senderId, `🎵 Now playing: *${title}*`);
    await messenger.sendAudio(senderId, audioPath);

    // Clean up after sending
    setTimeout(() => {
      try { fs.unlinkSync(audioPath); } catch (e) {}
    }, 10000);

  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : '';
    console.error('❌ Song download error:', err.message);
    if (stderr) console.error('yt-dlp stderr:', stderr);

    if (err.message.includes('File is larger than') || stderr.includes('File is larger than')) {
      await messenger.sendText(senderId,
        `⚠️ That song is too large to send directly (>25MB).\nTry a shorter track or search for an edited version!`
      );
    } else if (stderr.includes('ffmpeg') || stderr.includes('ffprobe')) {
      await messenger.sendText(senderId,
        `⚠️ Server is missing ffmpeg. Please ask the bot operator to install it.`
      );
    } else {
      await messenger.sendText(senderId,
        `❌ Couldn't play "${songName}". Try:\n• A more specific name\n• Adding the artist name\nExample: *#sing Shape of You Ed Sheeran*`
      );
    }
  }
}

module.exports = { handleSing };
