import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

// Tell the server where your public website files are located
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = process.env.GEMINI_API_KEY;

// API endpoint that handles chat requests from your webpage
app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{
              text: "You are GroundedMind, an empathetic, non-clinical grounding companion for stressed university students. Keep guidance actionable, gentle, and concise (under 90 words). Use bullet points where appropriate."
            }]
          },
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Take a slow breath. I am right here with you.";
    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: 'Server could not reach Google AI services.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`GroundedMind is running at: http://localhost:${PORT}`);
});