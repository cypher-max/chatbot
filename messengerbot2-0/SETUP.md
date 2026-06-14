# 🎵 Messenger Music Bot — Setup Guide

A Facebook Messenger bot that:
- **#sing [song]** — Sends songs as voice messages
- **#lyrics [song]** — Fetches full lyrics
- **#quiz [topic]** — AI-generated music quizzes
- **#answer A/B/C/D** — Answer quiz questions
- **#trivia** — Random music facts
- **#leaderboard** — Top quiz scorers

---

## Prerequisites

- Node.js 18+
- Python + pip (for yt-dlp)
- A public HTTPS server (e.g. a VPS, Railway, Render, or ngrok for local testing)
- A Meta Developer account

---

## Step 1 — Install Dependencies

```bash
npm install
pip install yt-dlp
```

---

## Step 2 — Facebook App Setup

1. Go to **https://developers.facebook.com** and create a new App
2. Choose **Business** → next → add **Messenger** product
3. Under **Messenger → Settings**:
   - Create or link a **Facebook Page** for your bot
   - Generate a **Page Access Token** — copy it
4. Go to **Webhooks → Add Callback URL**:
   - URL: `https://your-server.com/webhook`
   - Verify Token: `my_messenger_bot_token` (or whatever you set in `.env`)
   - Subscribe to: `messages`, `messaging_postbacks`
5. Subscribe your page to the webhook

---

## Step 3 — Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
PAGE_ACCESS_TOKEN=EAAxxxxxxxxxxxxxxx   # From Meta Developer Console
VERIFY_TOKEN=my_messenger_bot_token    # Must match what you entered in Meta
PORT=3000
```

---

## Step 4 — Deploy & Run

### Option A: Local testing with ngrok
```bash
ngrok http 3000          # Get your public HTTPS URL
npm run dev              # Start the bot
```

### Option B: Deploy to Render (recommended for production)

Render needs ffmpeg and yt-dlp, which aren't part of a normal Node environment, so this project includes a **Dockerfile** that installs everything automatically.

1. Push this project to a GitHub repo.
2. Go to **https://dashboard.render.com** → **New +** → **Web Service**.
3. Connect your GitHub repo.
4. Render should auto-detect the `Dockerfile` (or `render.yaml` if using "New Blueprint Instance"). If asked for a runtime, choose **Docker**.
5. Under **Environment**, add:
   - `PAGE_ACCESS_TOKEN` = your token from Meta
   - `VERIFY_TOKEN` = the value you'll enter in the Meta webhook setup
6. Click **Create Web Service**. The first build takes a few minutes (installing ffmpeg + yt-dlp).
7. Once deployed, Render gives you a permanent URL like `https://messenger-music-bot.onrender.com`. Use `https://messenger-music-bot.onrender.com/webhook` as your Meta webhook callback URL — this URL never changes, unlike ngrok.

> ⚠️ **Important — read before relying on `#sing`:**
> YouTube actively blocks requests coming from cloud/datacenter IP ranges (AWS, Render, etc.), even with an updated yt-dlp and the Android client workaround. This means `#sing` may work perfectly on your home computer but fail with 403 errors once deployed to Render. If that happens:
> - There's no permanent fix since this is YouTube vs. scrapers — yt-dlp updates help temporarily but YouTube re-blocks over time.
> - Workarounds include routing yt-dlp through a residential proxy (paid services exist for this) or using `--cookies-from-browser`/`--cookies cookies.txt` from a logged-in YouTube account, uploaded as a file to your server.
> - `#lyrics`, `#quiz`, `#trivia`, and `#leaderboard` don't depend on yt-dlp and will work normally regardless.

### Option C: Other Node hosts (Railway, Fly.io, etc.)
The same Dockerfile works on any platform that supports Docker deployments — the setup steps are nearly identical to Render.


---

## Step 5 — Test Your Bot

Message your Facebook Page:
- `#help` — See all commands
- `#sing Blinding Lights` — Download and play a song
- `#lyrics Bohemian Rhapsody by Queen` — Get lyrics
- `#quiz pop` — Start a pop music quiz
- `#answer A` — Answer a quiz question
- `#trivia` — Random music fact
- `#leaderboard` — See top scores

---

## File Structure

```
messengerbot/
├── src/
│   ├── index.js                    # Express server + webhook
│   ├── handlers/
│   │   └── messageHandler.js       # Routes #commands to services
│   └── services/
│       ├── messengerService.js     # Facebook API calls
│       ├── songService.js          # #sing — yt-dlp download + audio send
│       ├── lyricsService.js        # #lyrics — lyrics.ovh + Claude fallback
│       ├── quizService.js          # #quiz / #answer — AI-generated Q&A
│       ├── triviaService.js        # #trivia — random music facts
│       └── leaderboardService.js   # #leaderboard — JSON file storage
├── data/
│   ├── songs/                      # Temporary downloaded audio files
│   └── leaderboard.json            # Persistent scores (auto-created)
├── .env.example
├── package.json
└── SETUP.md
```

---

## Notes & Limits

| Feature | Limit / Note |
|---|---|
| Song file size | Max 25MB (Facebook limit) — ~4–5 min songs |
| Song format | MP3, extracted by yt-dlp from YouTube |
| Lyrics API | lyrics.ovh (free) + Claude AI fallback |
| Quiz | 5 questions per round, AI-generated |
| Leaderboard | Stored in `data/leaderboard.json` (use a DB for scale) |

---

## Upgrading to a Database

The leaderboard uses a local JSON file by default. For production with many users, swap `leaderboardService.js` to use SQLite, MongoDB, or PostgreSQL.

---

## Troubleshooting

**Bot not responding?**
- Check your `PAGE_ACCESS_TOKEN` and `VERIFY_TOKEN` in `.env`
- Make sure your server is publicly accessible over HTTPS
- Check Meta webhook subscription is active

**Song download failing?**
- Run `yt-dlp --version` to confirm it's installed
- Try manually: `yt-dlp "ytsearch1:song name" -x --audio-format mp3`
- YouTube sometimes blocks IPs — try with a VPN or proxy

**Lyrics not found?**
- Format as `#lyrics Song Name by Artist Name`
- lyrics.ovh sometimes has limited coverage for non-English songs
