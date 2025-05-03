import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Transcribe audio from video file
 * @param {string} videoPath - Path to video file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} - Transcription result
 */
export const transcribeAudio = async (videoPath, options = {}) => {
  try {
    if (!videoPath || !fs.existsSync(videoPath)) {
      throw new Error('Video file not found');
    }

    // Extract audio from video
    const audioPath = await extractAudioFromVideo(videoPath);
    
    // Perform speech recognition
    const transcription = await performSpeechRecognition(audioPath, options);
    
    // Clean up temporary audio file
    cleanupTempFiles(audioPath);
    
    return transcription;
  } catch (error) {
    console.error('Error transcribing audio:', error);
    throw error;
  }
};

/**
 * Extract audio from video file
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
const extractAudioFromVideo = async (videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      const audioFilename = path.basename(videoPath, path.extname(videoPath)) + '.wav';
      const audioPath = path.join(tempDir, audioFilename);
      
      ffmpeg(videoPath)
        .output(audioPath)
        .audioCodec('pcm_s16le')
        .audioChannels(1)
        .audioFrequency(16000)
        .on('end', () => {
          resolve(audioPath);
        })
        .on('error', (err) => {
          reject(new Error(`Error extracting audio: ${err.message}`));
        })
        .run();
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Perform speech recognition on audio file
 * @param {string} audioPath - Path to audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} - Transcription result
 */
const performSpeechRecognition = async (audioPath, options = {}) => {
  // For this implementation, we'll use a simple mock transcription
  // In a real implementation, you would use a speech recognition service like Google Cloud Speech-to-Text
  
  return new Promise((resolve) => {
    // Simulate processing time
    setTimeout(() => {
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
        transcriptionText = "[00:00:00] " + transcriptionText.replace(/\. /g, ".\n[00:00:05] ");
      }
      
      resolve({
        text: transcriptionText,
        language: 'en-US',
        timestamps: options.includeTimestamps,
        style: style
      });
    }, 2000);
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
