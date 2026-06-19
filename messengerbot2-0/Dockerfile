# Use an official Node image based on Debian so we can apt-get extra tools.
# Node 20+ is required — the PO Token Provider's dependencies (jsdom and its
# sub-dependencies) ship as ES Modules that fail under Node 18's require().
FROM node:20-slim

# Install ffmpeg (audio conversion), python3/pip, curl (to fetch yt-dlp),
# unzip (required by the Deno installer), and git (to clone the PO token provider)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 python3-pip curl unzip git && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp (use the official binary install — avoids pip/apt package conflicts)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

# Install Deno — yt-dlp uses this as a JS runtime to solve YouTube's
# signature/"n-parameter" challenges (EJS). Without it, YouTube only serves
# image-only formats and downloads fail with "Requested format is not available".
# The standalone yt-dlp binary already bundles the EJS solver scripts, so
# Deno is the only extra piece needed (per official yt-dlp EJS setup docs).
ENV DENO_INSTALL=/usr/local
RUN curl -fsSL https://deno.land/install.sh | sh -s -- -y

# --- PO Token Provider setup (avoids needing a YouTube cookies file) ---
# YouTube requires a "Proof of Origin" token to confirm requests come from a
# real client. Without cookies, yt-dlp needs this token from somewhere else —
# bgutil-ytdlp-pot-provider runs a small local server that generates these
# tokens automatically, so no manual cookie export/rotation is needed.
#
# Since we're using the standalone yt-dlp binary (not pip-installed), the
# plugin must be installed by placing its release zip into one of yt-dlp's
# documented SYSTEM plugin directories — `pip install bgutil-ytdlp-pot-provider`
# only wires itself up for a pip-installed yt-dlp, so it silently does
# nothing for the binary install, which is what caused #sing to keep hitting
# "Sign in to confirm you're not a bot" even with the provider running.
# Docs: https://github.com/yt-dlp/yt-dlp/wiki/Plugins#installing-plugins

# 1. Install the yt-dlp-side plugin into yt-dlp's system plugin directory
RUN mkdir -p /etc/yt-dlp-plugins \
    && curl -L https://github.com/Brainicism/bgutil-ytdlp-pot-provider/releases/latest/download/bgutil-ytdlp-pot-provider.zip \
       -o /etc/yt-dlp-plugins/bgutil-ytdlp-pot-provider.zip

# 2. Clone and build the provider server itself (Node-based HTTP server)
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-provider \
    && cd /opt/bgutil-provider/server \
    && npm install \
    && npx tsc

# 3. Verify the plugin is actually detected — fails the build loudly here
# instead of silently falling back to cookies/bot-detection failures later.
RUN yt-dlp --version && \
    yt-dlp -v --simulate "https://www.youtube.com/watch?v=dQw4w9WgXcQ" 2>&1 | grep -i "bgutil" || \
    (echo "❌ bgutil PO Token plugin was not detected by yt-dlp — check plugin install path" && exit 1)

WORKDIR /app

# Install Node dependencies first (better build caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .

# Create data directories used for temporary song files and leaderboard storage
RUN mkdir -p data/songs

ENV PORT=3000
EXPOSE 3000

CMD ["node", "start.js"]
