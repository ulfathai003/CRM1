import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload limit for base64 images uploads
app.use(express.json({ limit: '50mb' }));

const ai = new GoogleGenAI(
  process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : {}
);

// Route to handle invoice processing via Gemini Vision
app.post('/api/extract-invoice', async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
    }

    const { imageBase64, mimeType } = req.body;
    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing imageBase64 or mimeType in request payload' });
    }

    const prompt = `
      You are an expert bookkeeping assistant. Extract key invoicing information from the provided document.
      Provide the result strictly as a valid JSON object with the following keys exactly:
      - payee (string): Who was paid or the vendor name.
      - amountPaid (number): The total amount paid listed. Write numbers only (e.g. 1500). Assume currency is local (Rupees) if applicable, but never include currency symbols.
      - date (string): Date of invoice in YYYY-MM-DD. Return empty string if not found.
      - description (string): A very short sentence describing the service/product from line items.
      - category (string): Must be exactly one of these: 'Materials', 'Labor', 'Legal', 'Logistics', 'Other'.
      - rawText (string): The full raw text content extracted from the document.
    `;

    // Strip standard data URI format prefixes from the base64 string
    const base64Data = imageBase64.replace(/^data:[a-zA-Z0-9\/\+\-\.]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
      config: {
         responseMimeType: 'application/json'
      }
    });

    const textPayload = response.text || '{}';
    const jsonResult = JSON.parse(textPayload);
    res.json(jsonResult);
  } catch (error: any) {
    console.error('Invoice Extraction Error:', error);
    res.status(500).json({ error: error.message || 'Server encountered an error while parsing text.' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
