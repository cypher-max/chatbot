# Use an official Node image based on Debian so we can apt-get extra tools
FROM node:18-slim

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

# 1. Install the yt-dlp-side plugin that talks to the provider server
RUN pip3 install --break-system-packages -U bgutil-ytdlp-pot-provider

# 2. Clone and build the provider server itself (Node-based HTTP server)
RUN git clone --depth 1 https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil-provider \
    && cd /opt/bgutil-provider/server \
    && npm install \
    && npx tsc

WORKDIR /app

# Install Node dependencies first (better build caching)
COPY package*.json ./
RUN npm install --omit=dev

# Copy the rest of the app
COPY . .
RUN chmod +x start.sh

# Create data directories used for temporary song files and leaderboard storage
RUN mkdir -p data/songs

ENV PORT=3000
EXPOSE 3000

CMD ["./start.sh"]
