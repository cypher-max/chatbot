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

  // Cookies are now OPTIONAL. By default, this bot uses a local PO Token
  // Provider server (bgutil-ytdlp-pot-provider, started alongside the bot —
  // see start.sh / Dockerfile) to bypass YouTube's bot check, instead of a
  // YouTube cookies file. This avoids the need to manually re-export and
  // re-upload cookies every time they expire. If a cookies file IS present
  // (e.g. you added one back for some reason), it still takes priority.
  const cookiesSourcePath = process.env.YT_COOKIES_PATH || '/etc/secrets/cookies.txt';
  const cookiesWritablePath = '/tmp/yt-cookies.txt';
  let hasCookies = false;

  if (fs.existsSync(cookiesSourcePath)) {
    try {
      fs.copyFileSync(cookiesSourcePath, cookiesWritablePath);
      hasCookies = true;
    } catch (e) {
      console.log('⚠️  Failed to copy cookies file:', e.message);
    }
  }

  try {
    // yt-dlp must be installed on the server: pip install yt-dlp
    //
    // Client selection:
    // - The "android" client avoids plain 403 errors but does NOT support
    //   cookies, and (per yt-dlp docs) has no account cookie support anyway.
    // - "tv" accepts cookies and isn't restricted to image-only formats.
    // - When using the PO Token Provider (no cookies), "tv" is also the
    //   safest choice since it doesn't require a PO token for streaming.
    const clientArg = hasCookies ? 'tv' : 'tv';

    const command = [
      'yt-dlp',
      `"ytsearch1:${safeName} audio"`,  // Search YouTube
      '-x',                              // Extract audio only
      '--audio-format mp3',
      '--audio-quality 5',               // Medium quality (smaller file)
      '--max-filesize 25m',              // Facebook 25MB limit
      `--output "${outputTemplate}"`,
      '--no-playlist',
      `--extractor-args "youtube:player_client=${clientArg}"`,
      // Lets yt-dlp pull updated JS-challenge-solver scripts from GitHub if
      // the version bundled in the binary is outdated (Deno runtime solves
      // YouTube's signature/n-parameter challenges using these scripts).
      '--remote-components ejs:github',
      ...(hasCookies ? [`--cookies "${cookiesWritablePath}"`] : []),
    ].join(' ');

    if (!hasCookies) {
      console.log('ℹ️  No cookies file found — relying on local PO Token Provider for bot-check bypass.');
    }

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
    } else if (stderr.includes('Sign in to confirm')) {
      await messenger.sendText(senderId,
        `⚠️ YouTube is blocking song downloads from this server right now. The PO Token Provider may be down — check Render logs for the provider service.`
      );
    } else if (stderr.includes('getpot') || stderr.includes('bgutil') || stderr.includes('ECONNREFUSED')) {
      await messenger.sendText(senderId,
        `⚠️ The PO Token Provider isn't responding. Check that the provider service started correctly — see SETUP.md.`
      );
    } else if (stderr.includes('Requested format is not available') || stderr.includes('Only images are available') || stderr.includes('Signature solving failed') || stderr.includes('n challenge solving failed')) {
      await messenger.sendText(senderId,
        `⚠️ YouTube changed something on their end again. The bot operator needs to check the JS challenge solver (Deno) — see SETUP.md.`
      );
    } else {
      await messenger.sendText(senderId,
        `❌ Couldn't play "${songName}". Try:\n• A more specific name\n• Adding the artist name\nExample: *#sing Shape of You Ed Sheeran*`
      );
    }
  }
}

module.exports = { handleSing };
