# Use an official Node image based on Debian so we can apt-get extra tools
FROM node:18-slim

# Install ffmpeg (audio conversion), python3/pip, and curl (to fetch yt-dlp)
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg python3 python3-pip curl && \
    rm -rf /var/lib/apt/lists/*

# Install yt-dlp (use the official binary install — avoids pip/apt package conflicts)
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
    && chmod a+rx /usr/local/bin/yt-dlp

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

CMD ["node", "src/index.js"]
