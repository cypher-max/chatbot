const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const BASE_URL = 'https://graph.facebook.com/v19.0/me/messages';

/**
 * Send a plain text message
 */
async function sendText(recipientId, text) {
  try {
    await axios.post(BASE_URL, {
      recipient: { id: recipientId },
      message: { text },
    }, {
      params: { access_token: PAGE_ACCESS_TOKEN },
    });
  } catch (err) {
    console.error('❌ sendText error:', err.response?.data || err.message);
  }
}

/**
 * Send an audio file as a voice message
 */
async function sendAudio(recipientId, audioFilePath) {
  try {
    const ext = path.extname(audioFilePath).slice(1) || 'mp3';
    const contentTypeMap = {
      mp3: 'audio/mpeg',
      webm: 'audio/webm',
      m4a: 'audio/mp4',
      opus: 'audio/ogg',
      ogg: 'audio/ogg',
    };
    const contentType = contentTypeMap[ext] || 'audio/mpeg';

    const form = new FormData();
    form.append('recipient', JSON.stringify({ id: recipientId }));
    form.append('message', JSON.stringify({
      attachment: {
        type: 'audio',
        payload: { is_reusable: true },
      },
    }));
    form.append('filedata', fs.createReadStream(audioFilePath), {
      contentType,
      filename: `song.${ext}`,
    });

    await axios.post(BASE_URL, form, {
      params: { access_token: PAGE_ACCESS_TOKEN },
      headers: form.getHeaders(),
    });

    console.log(`🎵 Audio sent to ${recipientId}`);
  } catch (err) {
    console.error('❌ sendAudio error:', err.response?.data || err.message);
  }
}

/**
 * Send an audio file by URL (if already hosted)
 */
async function sendAudioUrl(recipientId, audioUrl) {
  try {
    await axios.post(BASE_URL, {
      recipient: { id: recipientId },
      message: {
        attachment: {
          type: 'audio',
          payload: {
            url: audioUrl,
            is_reusable: true,
          },
        },
      },
    }, {
      params: { access_token: PAGE_ACCESS_TOKEN },
    });
    console.log(`🔗 Audio URL sent to ${recipientId}`);
  } catch (err) {
    console.error('❌ sendAudioUrl error:', err.response?.data || err.message);
  }
}

/**
 * Send quick reply buttons
 */
async function sendQuickReplies(recipientId, text, options) {
  const quickReplies = options.map(opt => ({
    content_type: 'text',
    title: opt,
    payload: opt,
  }));

  try {
    await axios.post(BASE_URL, {
      recipient: { id: recipientId },
      message: { text, quick_replies: quickReplies },
    }, {
      params: { access_token: PAGE_ACCESS_TOKEN },
    });
  } catch (err) {
    console.error('❌ sendQuickReplies error:', err.response?.data || err.message);
  }
}

module.exports = { sendText, sendAudio, sendAudioUrl, sendQuickReplies };
