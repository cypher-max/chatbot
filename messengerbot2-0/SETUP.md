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
GEMINI_API_KEY=AIzaxxxxxxxxxxx         # From aistudio.google.com/apikey — required for #quiz, #trivia, lyrics fallback
PORT=3000
```

> **Getting a Gemini API key (free, no credit card):** Go to **https://aistudio.google.com/apikey**, sign in with a Google account, and click **Create API key**. The free tier covers roughly 1,500 requests/day on Gemini 2.5 Flash — far more than a personal bot needs. Without this key, `#quiz`, `#trivia`, and the AI lyrics fallback will not work, though `#sing` and the lyrics.ovh lookup will still function normally.
>
> ⚠️ **Important:** as of June 19, 2026, Google rejects requests from "unrestricted" API keys. After creating your key in AI Studio, find it in the API Keys list, click the **Unrestricted** label, choose **Add restrictions → Restrict to Gemini API only**, and confirm. Skipping this step will cause every `#quiz`/`#trivia`/lyrics request to fail.


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
   - `GEMINI_API_KEY` = your restricted key from aistudio.google.com/apikey (required for #quiz, #trivia, lyrics fallback)
6. Click **Create Web Service**. The first build takes a few minutes (installing ffmpeg + yt-dlp).
7. Once deployed, Render gives you a permanent URL like `https://messenger-music-bot.onrender.com`. Use `https://messenger-music-bot.onrender.com/webhook` as your Meta webhook callback URL — this URL never changes, unlike ngrok.

> ⚠️ **Important — read before relying on `#sing`:**
> YouTube actively blocks requests coming from cloud/datacenter IP ranges (AWS, Render, etc.). This means `#sing` may work perfectly on your home computer but fail with `Sign in to confirm you're not a bot` errors once deployed to Render. **This is expected — follow the cookies setup below to fix it.**
> - `#lyrics`, `#quiz`, `#trivia`, and `#leaderboard` don't depend on yt-dlp and will work normally regardless.

---

## Fixing "Sign in to confirm you're not a bot" (required for `#sing` on Render)

YouTube requires cloud-server requests to prove they're a real, logged-in browser. Cookies exported from a real YouTube session are currently **the only reliable way to do this** — this project also bundles a PO Token Provider as a secondary signal, but its own maintainers have noted it no longer bypasses this specific check on its own in most cases, so cookies are required.

### Step 1 — Export your YouTube cookies correctly

A normal "log in and export" often produces cookies that expire within minutes, because YouTube rotates session tokens in the background of an active tab. To avoid that:

1. Open a **private/incognito** browser window.
2. Log into YouTube (using a secondary/throwaway Google account is recommended — treat this file like a password).
3. In that same private window, navigate to **`https://www.youtube.com/robots.txt`** — literally that URL. This page has no YouTube scripts running, so nothing rotates your session while you export.
4. While still on that page, use a cookie-export extension (Chrome: "Get cookies.txt LOCALLY"; Firefox: "cookies.txt") to download `cookies.txt`.
5. Close that private window immediately and don't reopen it or browse YouTube in it again.

### Step 2 — Add it to Render as a Secret File

1. In your Render service, go to **Environment** → **Secret Files**.
2. Click **Add Secret File**.
3. **Filename / path**: `/etc/secrets/cookies.txt`
4. **Contents**: paste the full contents of your downloaded `cookies.txt`.
5. Save — Render redeploys automatically.

The code automatically looks for this file and uses it — no further changes needed.

### Step 3 — Verify it worked

Send `#sing [song name]` and check the logs. You should NOT see the `⚠️ No cookies file found` warning, and the download should succeed.

### When cookies eventually expire

Even exported correctly, cookies don't last forever — expect them to need refreshing every so often (this varies; could be days to weeks). When `#sing` starts failing again with `Sign in to confirm` or `cookies are no longer valid`, just repeat Steps 1–2 with a fresh export.

### About the bundled PO Token Provider

This project still runs a PO Token Provider (`bgutil-ytdlp-pot-provider`) alongside the bot as a secondary signal — it doesn't hurt to have it running, and it may help in some cases, but **don't rely on it alone**. Its own README currently states that passing PO tokens no longer reliably bypasses YouTube's bot check by itself. Cookies are the dependable method.

### Other Node hosts (Railway, Fly.io, etc.)
The same Dockerfile works on any platform that supports Docker deployments — the setup steps are nearly identical to Render. Secret file mechanisms differ slightly by platform; check their docs for the equivalent of Render's "Secret Files."

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
│       ├── geminiService.js        # Shared Gemini API helper (free tier)
│       ├── songService.js          # #sing — yt-dlp download + audio send
│       ├── lyricsService.js        # #lyrics — lyrics.ovh + Gemini fallback
│       ├── quizService.js          # #quiz / #answer — AI-generated Q&A
│       ├── triviaService.js        # #trivia — random facts, any topic
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
