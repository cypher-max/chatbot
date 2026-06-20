// Shared helper for calling Google's Gemini API (free tier — no credit card
// required). Used by quizService, triviaService, and the lyrics AI fallback.
//
// Get a key at https://aistudio.google.com/apikey — see SETUP.md for the
// important June 2026 key-restriction requirement.

const GEMINI_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

/**
 * Calls Gemini with a single user prompt and returns the generated text.
 * Throws a descriptive Error on any failure (missing key, HTTP error,
 * API-level error, or empty response) so callers can log/display specifics
 * instead of silently failing.
 */
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set in environment variables.');
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`Gemini API responded ${res.status}: ${errBody}`);
  }

  const data = await res.json();

  if (data.error) {
    throw new Error(`Gemini API error: ${data.error.status || data.error.code} - ${data.error.message}`);
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error('Empty response from Gemini API: ' + JSON.stringify(data));
  }

  return text;
}

module.exports = { callGemini };
