// ============================================================================
// GROUNDEDMIND BACKEND SERVER (Node.js + Express)
// ============================================================================

// 1. IMPORTING LIBRARIES (Helper packages installed via npm)
import express from 'express';     // Web framework to create local servers and API endpoints
import cors from 'cors';           // Security helper allowing your browser to talk to this server
import dotenv from 'dotenv';       // Reads secret keys from your hidden .env file
import path from 'path';           // Node.js helper to navigate computer folder paths
import { fileURLToPath } from 'url'; // Converts file URLs to standard computer directory paths

// Load variables from the .env file into Node.js (process.env)
dotenv.config();

// In modern ES Modules (type: "module"), __dirname is not built-in.
// These two lines recreate __dirname so we know the exact current folder path.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Express server application
const app = express();

// ============================================================================
// 2. MIDDLEWARE (Functions that process incoming requests before handling them)
// ============================================================================

// Allow Cross-Origin requests (lets index.html make requests to this backend)
app.use(cors());

// Enable Express to automatically parse incoming JSON data from frontend requests
app.use(express.json());

// Serve static frontend files:
// Anything placed inside the "public" folder (like index.html, css, js) 
// will be accessible directly in the browser at http://localhost:3000/
app.use(express.static(path.join(__dirname, 'public')));

// Fetch the secret API key stored in .env
const API_KEY = process.env.GEMINI_API_KEY;

// List of Gemini model versions to try.
// If the primary model is busy or overloaded, the server automatically tries the next one.
const MODELS_TO_TRY = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-2.5-flash'
];

// ============================================================================
// 3. API ROUTES (Endpoints where the frontend sends and receives data)
// ============================================================================

// This POST route listens for requests sent to: http://localhost:3000/api/chat
app.post('/api/chat', async (req, res) => {
  // Extract the "prompt" text sent from the browser
  const { prompt } = req.body;

  // Validation: Check if the user sent empty text
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  // Validation: Ensure the API key actually exists in .env
  if (!API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing from your .env file.' });
  }

  let lastErrorMessage = '';

  // Loop through our list of models until one answers successfully
  for (const model of MODELS_TO_TRY) {
    try {
      // The official Google API URL for text generation
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${API_KEY}`;
      
      // Make the secure network request directly to Google's servers
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // System instructions define the AI's persona, tone, and safety rules
          system_instruction: {
            parts: [{
              text: "You are GroundedMind, an empathetic, non-clinical grounding companion for university students dealing with stress. Keep guidance gentle, practical, concise (under 90 words), and use bullet points where helpful."
            }]
          },
          // The actual message or prompt sent by the student
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      // Parse Google's response into a JavaScript object
      const data = await response.json();

      // Check if Google succeeded and returned generated text
      if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiReply = data.candidates[0].content.parts[0].text;
        
        // Send the AI's response text back to the browser
        return res.json({ reply: aiReply });
      }

      // If Google returned an error (e.g., high server demand), record it and try the backup
      lastErrorMessage = data.error?.message || 'Model temporarily unavailable.';
      console.warn(`Model ${model} was unavailable: ${lastErrorMessage}. Trying next backup...`);

    } catch (err) {
      // Catch network-level connection failures (e.g., dropped Wi-Fi)
      lastErrorMessage = err.message;
      console.warn(`Network failure connecting to ${model}: ${err.message}. Trying next backup...`);
    }
  }

  // If every model in the loop failed, send an error response to the frontend
  res.status(503).json({ error: `All models are currently busy. Details: ${lastErrorMessage}` });
});

// ============================================================================
// 4. START THE SERVER
// ============================================================================

// Use the port defined in .env, or default to 3000
const PORT = process.env.PORT || 3000;

// Tell Express to start listening for incoming connections
app.listen(PORT, () => {
  console.log(`GroundedMind is running at: http://localhost:${PORT}`);
});