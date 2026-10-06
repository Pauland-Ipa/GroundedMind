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
app.use(express.static(path.join(__dirname, 'public')));

const API_KEY = process.env.GEMINI_API_KEY;

// Automatically finds which Gemini model is active for your account
async function getActiveModel() {
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`);
    const data = await res.json();

    if (data.error) {
      console.error('Google Key Notice:', data.error.message);
      return null;
    }

    if (data.models && data.models.length > 0) {
      // Find models that can generate text
      const usableModels = data.models
        .filter(m => m.supportedGenerationMethods?.includes('generateContent'))
        .map(m => m.name.replace('models/', ''));

      // Prefer a fast "flash" model, otherwise take the first usable one
      const chosen = usableModels.find(name => name.includes('flash')) || usableModels[0];
      return chosen;
    }
  } catch (err) {
    console.error('Could not connect to Google model directory:', err.message);
  }
  return 'gemini-1.5-flash';
}

let currentModel = null;

app.post('/api/chat', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing from your .env file.' });
  }

  try {
    if (!currentModel) {
      currentModel = await getActiveModel();
    }

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${API_KEY}`,
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
app.listen(PORT, async () => {
  console.log(`GroundedMind is running at: http://localhost:${PORT}`);
  currentModel = await getActiveModel();
  if (currentModel) {
    console.log(`Connected to Google AI successfully! Using model: ${currentModel}`);
  } else {
    console.log('Could not identify a model. Check your API key in .env');
  }
});