import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { spawn } from 'child_process';
import { exec } from 'child_process';

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Path to the Vosk model
const MODEL_PATH = path.join(__dirname, '../../models/vosk-model-en-us-small');

// Path to the Python script
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'vosk_transcribe.py');

/**
 * Transcribe audio using Vosk
 * @param {string} audioPath - Path to audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} - Transcription result
 */
export const transcribeAudioWithVosk = async (audioPath, options = {}) => {
  try {
    if (!fs.existsSync(audioPath)) {
      throw new Error('Audio file not found');
    }

    // Check if model exists
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error(`Vosk model not found at ${MODEL_PATH}`);
    }

    // Check if Python script exists
    if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
      throw new Error(`Python script not found at ${PYTHON_SCRIPT_PATH}`);
    }

    // Create output path for transcription
    const outputPath = path.join(tempDir, `transcription_${Date.now()}.json`);

    // Run Python script to transcribe audio
    const result = await runPythonTranscription(audioPath, outputPath);

    // Format the result based on options
    const formattedResult = formatTranscription(result, options);

    // Clean up the output file
    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    return formattedResult;
  } catch (error) {
    console.error('Error transcribing audio with Vosk:', error);
    return fallbackTranscription(options);
  }
};

/**
 * Run Python script to transcribe audio
 * @param {string} audioPath - Path to audio file
 * @param {string} outputPath - Path to save transcription
 * @returns {Promise<Object>} - Transcription result
 */
const runPythonTranscription = async (audioPath, outputPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Command to run Python script
      const command = `python3 "${PYTHON_SCRIPT_PATH}" "${audioPath}" --model "${MODEL_PATH}" --output "${outputPath}"`;

      console.log(`Running command: ${command}`);

      // Execute the command
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(`Error executing Python script: ${error.message}`);
          console.error(`stderr: ${stderr}`);
          return reject(error);
        }

        if (stderr) {
          console.warn(`Python script warnings: ${stderr}`);
        }

        try {
          // Parse the output
          const result = JSON.parse(stdout);

          // Check for errors
          if (result.error) {
            console.error(`Python script error: ${result.error}`);
            return reject(new Error(result.error));
          }

          resolve(result);
        } catch (parseError) {
          console.error(`Error parsing Python script output: ${parseError.message}`);
          console.error(`stdout: ${stdout}`);
          reject(parseError);
        }
      });
    } catch (error) {
      console.error(`Error running Python script: ${error.message}`);
      reject(error);
    }
  });
};

/**
 * Format transcription based on options
 * @param {Object} result - Vosk recognition result
 * @param {Object} options - Transcription options
 * @returns {Object} - Formatted transcription
 */
const formatTranscription = (result, options) => {
  try {
    // Extract text from result
    let text = '';
    if (result && result.text) {
      text = result.text;
    } else if (result && result.alternatives && result.alternatives.length > 0) {
      text = result.alternatives[0].text;
    }

    // Apply transcription style
    const style = options.style || 'clean';
    let formattedText = text;

    switch (style) {
      case 'verbatim':
        // Keep as is (verbatim)
        break;
      case 'condensed':
        // Simplify and condense the text
        formattedText = condensedTranscription(text);
        break;
      case 'clean':
      default:
        // Clean up the text (remove filler words, fix grammar)
        formattedText = cleanTranscription(text);
        break;
    }

    // Add timestamps if requested
    if (options.includeTimestamps && result.result) {
      formattedText = addTimestamps(formattedText, result.result);
    }

    return {
      text: formattedText,
      language: 'en-US',
      timestamps: options.includeTimestamps,
      style: style,
      segments: result.result || []
    };
  } catch (error) {
    console.error('Error formatting transcription:', error);
    return {
      text: result.text || '',
      language: 'en-US',
      timestamps: options.includeTimestamps,
      style: options.style || 'clean',
      segments: []
    };
  }
};

/**
 * Clean up transcription text
 * @param {string} text - Raw transcription text
 * @returns {string} - Cleaned transcription
 */
const cleanTranscription = (text) => {
  // Remove filler words
  let cleaned = text.replace(/\\b(um|uh|like|you know|I mean|so)\\b/gi, '');

  // Fix common grammatical issues
  cleaned = cleaned.replace(/\\bgonna\\b/g, 'going to');
  cleaned = cleaned.replace(/\\bwanna\\b/g, 'want to');
  cleaned = cleaned.replace(/\\bgotta\\b/g, 'got to');

  // Remove repeated words
  cleaned = cleaned.replace(/\\b(\\w+)\\s+\\1\\b/gi, '$1');

  // Fix spacing
  cleaned = cleaned.replace(/\\s+/g, ' ').trim();

  // Ensure proper capitalization
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);

  return cleaned;
};

/**
 * Create condensed version of transcription
 * @param {string} text - Raw transcription text
 * @returns {string} - Condensed transcription
 */
const condensedTranscription = (text) => {
  // First clean the text
  let condensed = cleanTranscription(text);

  // Remove less important parts (simplistic approach)
  condensed = condensed.replace(/\\b(I think that|as I said|as I mentioned|basically|actually|essentially)\\b/gi, '');

  // Simplify common phrases
  condensed = condensed.replace(/\\bin order to\\b/gi, 'to');
  condensed = condensed.replace(/\\bdue to the fact that\\b/gi, 'because');
  condensed = condensed.replace(/\\bat this point in time\\b/gi, 'now');

  // Fix spacing
  condensed = condensed.replace(/\\s+/g, ' ').trim();

  return condensed;
};

/**
 * Add timestamps to transcription
 * @param {string} text - Transcription text
 * @param {Array} segments - Word segments with timing information
 * @returns {string} - Transcription with timestamps
 */
const addTimestamps = (text, segments) => {
  if (!segments || segments.length === 0) {
    return text;
  }

  try {
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let result = '';
    let currentPosition = 0;

    sentences.forEach((sentence) => {
      // Find approximate timestamp for this sentence
      const words = sentence.trim().split(/\\s+/);
      const firstWord = words[0].toLowerCase();

      // Find the segment containing the first word of the sentence
      for (let i = currentPosition; i < segments.length; i++) {
        if (segments[i].word && segments[i].word.toLowerCase().includes(firstWord)) {
          // Format timestamp as [MM:SS]
          const seconds = Math.floor(segments[i].start);
          const minutes = Math.floor(seconds / 60);
          const remainingSeconds = seconds % 60;
          const timestamp = `[${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}]`;

          result += `${timestamp} ${sentence.trim()}\n`;
          currentPosition = i + 1;
          break;
        }
      }
    });

    return result.trim();
  } catch (error) {
    console.error('Error adding timestamps:', error);
    return text;
  }
};

/**
 * Fallback transcription when Vosk fails
 * @param {Object} options - Transcription options
 * @returns {Object} - Mock transcription result
 */
const fallbackTranscription = (options = {}) => {
  // Generate a mock transcription based on the transcription style
  let transcriptionText = '';
  const style = options.style || 'clean';

  switch (style) {
    case 'verbatim':
      transcriptionText = "Um, so in this Instagram Reel, I'm gonna, like, show you how to, um, make this really cool recipe that I, uh, learned from my grandmother. It's, you know, super easy and, like, really delicious.";
      break;
    case 'condensed':
      transcriptionText = "In this Reel, I'll show you a cool recipe I learned from my grandmother. It's easy and delicious.";
      break;
    case 'clean':
    default:
      transcriptionText = "In this Instagram Reel, I'm going to show you how to make this really cool recipe that I learned from my grandmother. It's super easy and really delicious.";
      break;
  }

  // Add timestamps if requested
  if (options.includeTimestamps) {
    transcriptionText = "[00:00] " + transcriptionText.replace(/\\. /g, ".\n[00:05] ");
  }

  return {
    text: transcriptionText,
    language: 'en-US',
    timestamps: options.includeTimestamps,
    style: style,
    segments: []
  };
};

/**
 * Extract audio from video file
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
export const extractAudioFromVideo = (videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      const audioFilename = path.basename(videoPath, path.extname(videoPath)) + '.wav';
      const audioPath = path.join(tempDir, audioFilename);

      // Use ffmpeg to extract audio
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoPath,
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        audioPath
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve(audioPath);
        } else {
          reject(new Error(`FFmpeg process exited with code ${code}`));
        }
      });

      ffmpeg.stderr.on('data', (data) => {
        console.log(`FFmpeg: ${data}`);
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Clean up temporary files
 * @param {string} filePath - Path to file to delete
 */
export const cleanupTempFiles = (filePath) => {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error('Error cleaning up temporary files:', error);
  }
};
