// ============================================================================
// GROUNDEDMIND BACKEND SERVER (Node.js + Express)
// ============================================================================

// 1. IMPORTING LIBRARIES (Pre-built tools installed via npm)
import express from 'express';     // Web framework to create local servers and API routes
import cors from 'cors';           // Security middleware allowing your browser to talk to this server
import dotenv from 'dotenv';       // Reads secret keys from your hidden .env file
import path from 'path';           // Node.js helper to navigate folder paths on your computer
import { fileURLToPath } from 'url'; // Converts file URLs to standard computer directory paths

// Load variables from the .env file into Node.js (accessible via process.env)
dotenv.config();

// In modern ES Modules (type: "module"), __dirname is not included by default.
// These two lines recreate __dirname so the server knows which folder it is running from.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize the Express server application
const app = express();

// ============================================================================
// 2. MIDDLEWARE (Configuring how the server receives and serves data)
// ============================================================================

// Allow Cross-Origin requests (lets index.html communicate with this server)
app.use(cors());

// Enable Express to parse incoming JSON data sent in request bodies
app.use(express.json());

// Serve static frontend files:
// Makes everything inside the "public" folder (HTML, CSS, JS) visible in the browser
app.use(express.static(path.join(__dirname, 'public')));

// Retrieve your private API key from the .env file
const API_KEY = process.env.GEMINI_API_KEY;

// ============================================================================
// 3. API ROUTE (Endpoint that receives prompts and sends them to Google Gemini)
// ============================================================================

// This POST route listens for requests sent to: http://localhost:3000/api/chat
app.post('/api/chat', async (req, res) => {
  // Extract the user's message ("prompt") from the request body
  const { prompt } = req.body;

  // Validation: Check if the user sent an empty message
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  // Validation: Ensure the API key actually exists in .env
  if (!API_KEY) {
    console.error('Error: GEMINI_API_KEY is not defined in your .env file.');
    return res.status(500).json({ error: 'GEMINI_API_KEY is missing from .env' });
  }

  try {
    // Direct endpoint targeting gemini-3.8-flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${API_KEY}`;
    
    // Send the prompt directly to Google's Gemini API
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // System instructions set the tone, boundaries, and persona of the companion
        system_instruction: {
          parts: [{
            text: "You are GroundedMind, an empathetic, non-clinical grounding companion for university students dealing with stress. Keep guidance gentle, practical, concise (under 90 words), and use bullet points where helpful."
          }]
        },
        // The actual prompt entered by the user or triggered by a button
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    // Parse the JSON response received from Google
    const data = await response.json();

    // Check if Google returned an error status or error object
    if (!response.ok || data.error) {
      console.error('Google API Error Response:', data.error || data);
      return res.status(response.status || 500).json({ 
        error: data.error?.message || 'Google API returned an error.' 
      });
    }

    // Extract the generated text reply safely
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Take a slow, deep breath. I am right here with you.";
    
    // Send the AI's reply back to the browser
    res.json({ reply });

  } catch (err) {
    // Catches network-level disconnections (e.g., lost internet connection)
    console.error('Backend Fetch Error:', err);
    res.status(500).json({ error: `Connection failed: ${err.message}` });
  }
});

// ============================================================================
// 4. START THE SERVER
// ============================================================================

// Use the PORT defined in .env, or fall back to port 3000
const PORT = process.env.PORT || 3000;

// Start listening for incoming browser requests
app.listen(PORT, () => {
  console.log(`GroundedMind is running at: http://localhost:${PORT}`);
});