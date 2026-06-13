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

**Local testing with ngrok:**
```bash
ngrok http 3000          # Get your public HTTPS URL
npm run dev              # Start the bot
```

**Production (e.g. Railway / Render):**
```bash
npm start
```

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
