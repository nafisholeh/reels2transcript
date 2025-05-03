import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

// Import utilities
import { extractInstagramReelData, cleanupTempFiles } from './utils/instagramExtractor.js';
import { transcribeAudioWithVosk, extractAudioFromVideo, cleanupTempFiles as cleanupVoskFiles } from './utils/voskTranscriber.js';
import { formatOutput } from './utils/formatOutput.js';

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

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
app.post('/api/extract/single', async (req, res) => {
  const { url, options } = req.body;

  // Validate URL
  if (!url || !url.includes('instagram.com')) {
    return res.status(400).json({
      error: 'Invalid URL',
      message: 'Please provide a valid Instagram Reel URL'
    });
  }

  try {
    // Extract data from Instagram Reel
    const extractedData = await extractInstagramReelData(url);

    // Extract audio from video
    const audioPath = await extractAudioFromVideo(extractedData.videoPath);

    // Transcribe audio using Vosk
    const transcription = await transcribeAudioWithVosk(audioPath, {
      style: options?.style || 'clean',
      includeTimestamps: options?.includeTimestamps || false
    });

    // Format output
    const formattedOutput = formatOutput({
      url: extractedData.url,
      caption: extractedData.caption,
      transcription: transcription,
      timestamp: extractedData.timestamp
    }, options?.format || 'plain');

    // Clean up temporary files
    cleanupTempFiles(extractedData.videoPath);
    cleanupVoskFiles(audioPath);

    // Return response
    res.status(200).json({
      success: true,
      data: {
        url: extractedData.url,
        transcription: transcription.text,
        caption: extractedData.caption,
        timestamp: extractedData.timestamp,
        formattedOutput: formattedOutput
      }
    });
  } catch (error) {
    console.error('Error processing Instagram Reel:', error);
    res.status(500).json({
      error: 'Processing Error',
      message: error.message || 'An error occurred while processing the Instagram Reel'
    });
  }
});

// API route for processing multiple Instagram Reel URLs
app.post('/api/extract/bulk', async (req, res) => {
  const { urls, options } = req.body;

  // Validate URLs
  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      error: 'Invalid URLs',
      message: 'Please provide an array of valid Instagram Reel URLs'
    });
  }

  // Limit the number of URLs to process
  const maxUrls = 50;
  if (urls.length > maxUrls) {
    return res.status(400).json({
      error: 'Too Many URLs',
      message: `You can process a maximum of ${maxUrls} URLs at once`
    });
  }

  try {
    // Process URLs sequentially to avoid overloading the server
    const results = [];

    for (const url of urls) {
      try {
        // Extract data from Instagram Reel
        const extractedData = await extractInstagramReelData(url);

        // Extract audio from video
        const audioPath = await extractAudioFromVideo(extractedData.videoPath);

        // Transcribe audio using Vosk
        const transcription = await transcribeAudioWithVosk(audioPath, {
          style: options?.style || 'clean',
          includeTimestamps: options?.includeTimestamps || false
        });

        // Format output
        const formattedOutput = formatOutput({
          url: extractedData.url,
          caption: extractedData.caption,
          transcription: transcription,
          timestamp: extractedData.timestamp
        }, options?.format || 'plain');

        // Add to results
        results.push({
          url: extractedData.url,
          transcription: transcription.text,
          caption: extractedData.caption,
          timestamp: extractedData.timestamp,
          formattedOutput: formattedOutput
        });

        // Clean up temporary files
        cleanupTempFiles(extractedData.videoPath);
        cleanupVoskFiles(audioPath);
      } catch (error) {
        // If one URL fails, continue with the others
        console.error(`Error processing URL ${url}:`, error);
        results.push({
          url: url,
          error: error.message || 'An error occurred while processing this URL',
          timestamp: new Date().toISOString()
        });
      }
    }

    // Return response
    res.status(200).json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error processing bulk URLs:', error);
    res.status(500).json({
      error: 'Processing Error',
      message: error.message || 'An error occurred while processing the URLs'
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
