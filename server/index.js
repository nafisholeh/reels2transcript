import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API route for processing a single Instagram Reel URL
app.post('/api/extract/single', (req, res) => {
  const { url, options } = req.body;

  // Validate URL
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'Please provide a valid Instagram Reel URL'
    });
  }

  // TODO: Implement actual extraction logic
  // This is a placeholder response
  const mockResponse = {
    success: true,
    data: {
      url: url,
      transcription: "This is a mock transcription for the provided Instagram Reel.",
      caption: "This is a mock caption for the provided Instagram Reel. #reels #instagram",
      timestamp: new Date().toISOString(),
      options: options || {}
    }
  };

  res.status(200).json(mockResponse);
});

// API route for processing multiple Instagram Reel URLs
app.post('/api/extract/bulk', (req, res) => {
  const { urls, options } = req.body;

  // Validate URLs
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      error: 'Invalid URLs',
      message: 'Please provide an array of valid Instagram Reel URLs'
    });
  }

  // TODO: Implement actual bulk extraction logic
  // This is a placeholder response
  const mockResponses = urls.map(url => ({
    url: url,
    transcription: `This is a mock transcription for ${url}`,
    caption: `This is a mock caption for ${url}. #reels #instagram`,
    timestamp: new Date().toISOString(),
    options: options || {}
  }));

  res.status(200).json({
    success: true,
    count: mockResponses.length,
    data: mockResponses
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
