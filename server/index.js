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
import { transcribeAudioWithVosk, extractAudioFromVideo } from './utils/voskTranscriber.js';
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
app.post('/api/extract', async (req, res) => {
  // Forward to the single extraction endpoint
  req.url = '/api/extract/single';
  app._router.handle(req, res);
});

// API route for processing a single Instagram Reel URL (detailed implementation)
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
    console.log(`\n========== Processing URL: ${url} ==========`);

    // Extract data from Instagram Reel
    console.log(`Step 1: Extracting data from Instagram Reel...`);
    const extractedData = await extractInstagramReelData(url);
    console.log(`Instagram data extracted successfully`);

    // Validate video path
    if (!extractedData.videoPath || !fs.existsSync(extractedData.videoPath)) {
      throw new Error('Invalid video path or video file not found');
    }

    // Check video file size
    const videoStats = fs.statSync(extractedData.videoPath);
    console.log(`Video file size: ${videoStats.size} bytes`);
    if (videoStats.size === 0) {
      throw new Error('Video file is empty');
    }

    // Extract audio from video with enhanced error handling
    console.log(`Step 2: Extracting audio from video...`);
    let audioPath;
    try {
      audioPath = await extractAudioFromVideo(extractedData.videoPath);
      console.log(`Audio extracted successfully to: ${audioPath}`);
    } catch (audioError) {
      console.error(`Audio extraction failed:`, audioError);
      throw new Error(`Failed to extract audio: ${audioError.message}`);
    }

    // Validate audio file
    if (!audioPath || !fs.existsSync(audioPath)) {
      throw new Error('Audio file not found after extraction');
    }

    const audioStats = fs.statSync(audioPath);
    console.log(`Audio file size: ${audioStats.size} bytes`);
    if (audioStats.size === 0) {
      throw new Error('Extracted audio file is empty');
    }

    // Transcribe audio using Vosk
    console.log(`Step 3: Transcribing audio using Vosk...`);
    const transcription = await transcribeAudioWithVosk(audioPath, {
      style: options?.style || 'clean',
      includeTimestamps: options?.includeTimestamps || false
    });
    console.log(`Transcription completed`);

    // Format output
    console.log(`Step 4: Formatting output...`);
    const formattedOutput = formatOutput({
      url: extractedData.url,
      caption: extractedData.caption,
      transcription: transcription,
      timestamp: extractedData.timestamp
    }, options?.format || 'plain');

    // Clean up temporary files
    cleanupTempFiles(extractedData.videoPath);
    // Keep WAV file for inspection in case of issues
    console.log(`WAV file for inspection: ${audioPath}`);

    // Ensure transcription text is not undefined
    if (!transcription.text || transcription.text.trim() === '') {
      console.warn('Transcription text is empty or undefined');

      // If we have segments, construct text from them
      if (transcription.segments && transcription.segments.length > 0) {
        console.log('CRITICAL FIX in server/index.js: Constructing text from segments');
        // Sort segments by start time
        const sortedSegments = [...transcription.segments].sort((a, b) => a.start - b.start);
        // Join words from segments
        transcription.text = sortedSegments.map(segment => segment.word).join(' ');
        console.log(`Constructed text from ${sortedSegments.length} segments: "${transcription.text}"`);
      } else {
        transcription.text = '';
      }
    }

    // Prepare response data
    const responseData = {
      url: extractedData.url,
      transcription: transcription.text,
      caption: extractedData.caption || '',
      timestamp: extractedData.timestamp,
      formattedOutput: formattedOutput,
      success: true
    };

    console.log(`========== Finished processing URL: ${url} ==========\n`);

    // Return response
    res.status(200).json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Error processing Instagram Reel:', error);

    // Determine error type for better user feedback
    let errorType = 'PROCESSING_ERROR';
    let errorMessage = error.message || 'An error occurred while processing the Instagram Reel';

    if (errorMessage.includes('FFmpeg process exited with code 234')) {
      errorType = 'AUDIO_EXTRACTION_ERROR';
      errorMessage = 'Failed to extract audio from video. The video may be corrupted or in an unsupported format.';
    } else if (errorMessage.includes('Audio file is empty')) {
      errorType = 'EMPTY_AUDIO_ERROR';
      errorMessage = 'The extracted audio file is empty. The video may not contain audio.';
    } else if (errorMessage.includes('Failed to download')) {
      errorType = 'DOWNLOAD_ERROR';
      errorMessage = 'Failed to download the Instagram Reel. The URL may be invalid or the content may be private.';
    }

    res.status(500).json({
      success: false,
      error: errorType,
      message: errorMessage
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
        console.log(`\n========== Processing URL: ${url} ==========`);

        // Extract data from Instagram Reel
        console.log(`Step 1: Extracting data from Instagram Reel...`);
        const extractedData = await extractInstagramReelData(url);
        console.log(`Instagram data extracted successfully`);

        // Validate video path
        if (!extractedData.videoPath || !fs.existsSync(extractedData.videoPath)) {
          throw new Error('Invalid video path or video file not found');
        }

        // Check video file size
        const videoStats = fs.statSync(extractedData.videoPath);
        console.log(`Video file size: ${videoStats.size} bytes`);
        if (videoStats.size === 0) {
          throw new Error('Video file is empty');
        }

        // Extract audio from video with enhanced error handling
        console.log(`Step 2: Extracting audio from video...`);
        let audioPath;
        try {
          audioPath = await extractAudioFromVideo(extractedData.videoPath);
          console.log(`Audio extracted successfully to: ${audioPath}`);
        } catch (audioError) {
          console.error(`Audio extraction failed:`, audioError);
          throw new Error(`Failed to extract audio: ${audioError.message}`);
        }

        // Validate audio file
        if (!audioPath || !fs.existsSync(audioPath)) {
          throw new Error('Audio file not found after extraction');
        }

        const audioStats = fs.statSync(audioPath);
        console.log(`Audio file size: ${audioStats.size} bytes`);
        if (audioStats.size === 0) {
          throw new Error('Extracted audio file is empty');
        }

        // Transcribe audio using Vosk
        console.log(`Step 3: Transcribing audio using Vosk...`);
        const transcription = await transcribeAudioWithVosk(audioPath, {
          style: options?.style || 'clean',
          includeTimestamps: options?.includeTimestamps || false
        });
        console.log(`Transcription completed`);

        // Format output
        console.log(`Step 4: Formatting output...`);
        const formattedOutput = formatOutput({
          url: extractedData.url,
          caption: extractedData.caption,
          transcription: transcription,
          timestamp: extractedData.timestamp
        }, options?.format || 'plain');

        // Ensure transcription text is not undefined
        if (!transcription.text || transcription.text.trim() === '') {
          console.warn('Transcription text is empty or undefined');

          // If we have segments, construct text from them
          if (transcription.segments && transcription.segments.length > 0) {
            console.log('CRITICAL FIX in server/index.js (bulk): Constructing text from segments');
            // Sort segments by start time
            const sortedSegments = [...transcription.segments].sort((a, b) => a.start - b.start);
            // Join words from segments
            transcription.text = sortedSegments.map(segment => segment.word).join(' ');
            console.log(`Constructed text from ${sortedSegments.length} segments: "${transcription.text}"`);
          } else {
            transcription.text = '';
          }
        }

        // Add to results
        results.push({
          url: extractedData.url,
          transcription: transcription.text,
          caption: extractedData.caption || '',
          timestamp: extractedData.timestamp,
          formattedOutput: formattedOutput,
          success: true
        });

        // Clean up temporary files
        cleanupTempFiles(extractedData.videoPath);
        // Keep WAV file for inspection in case of issues
        console.log(`WAV file for inspection: ${audioPath}`);
        console.log(`========== Finished processing URL: ${url} ==========\n`);
      } catch (error) {
        // If one URL fails, continue with the others
        console.error(`Error processing URL ${url}:`, error);

        // Determine error type for better user feedback
        let errorType = 'PROCESSING_ERROR';
        let errorMessage = error.message || 'An error occurred while processing this URL';

        if (errorMessage.includes('FFmpeg process exited with code 234')) {
          errorType = 'AUDIO_EXTRACTION_ERROR';
          errorMessage = 'Failed to extract audio from video. The video may be corrupted or in an unsupported format.';
        } else if (errorMessage.includes('Audio file is empty')) {
          errorType = 'EMPTY_AUDIO_ERROR';
          errorMessage = 'The extracted audio file is empty. The video may not contain audio.';
        } else if (errorMessage.includes('Failed to download')) {
          errorType = 'DOWNLOAD_ERROR';
          errorMessage = 'Failed to download the Instagram Reel. The URL may be invalid or the content may be private.';
        }

        results.push({
          url: url,
          error: errorMessage,
          errorType: errorType,
          timestamp: new Date().toISOString(),
          success: false
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
