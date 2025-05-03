import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create temp directory if it doesn't exist
const tempDir = path.join(__dirname, '../../temp');
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

/**
 * Extract data from Instagram Reel URL
 * @param {string} url - Instagram Reel URL
 * @returns {Promise<Object>} - Extracted data
 */
export const extractInstagramReelData = async (url) => {
  try {
    // Validate URL
    if (!isValidInstagramUrl(url)) {
      throw new Error('Invalid Instagram URL');
    }

    // For testing purposes, use a sample video file
    const sampleVideoPath = path.join(__dirname, '../../sample_data/sample_video.mp4');

    // If the sample video doesn't exist, create a directory and copy a sample video
    if (!fs.existsSync(sampleVideoPath)) {
      // Create sample_data directory if it doesn't exist
      const sampleDir = path.join(__dirname, '../../sample_data');
      if (!fs.existsSync(sampleDir)) {
        fs.mkdirSync(sampleDir, { recursive: true });
      }

      // For now, we'll just create an empty file for testing
      // In a real scenario, you would have a sample video file
      fs.writeFileSync(sampleVideoPath, '');

      console.log('Created sample video file for testing');
    }

    // Generate a unique filename for this request
    const urlHash = Buffer.from(url).toString('base64').replace(/[/+=]/g, '');
    const filename = `reel_${urlHash}.mp4`;
    const filePath = path.join(tempDir, filename);

    // Copy the sample video to the temp directory
    fs.copyFileSync(sampleVideoPath, filePath);

    // Mock data for testing
    const caption = "This is a sample Instagram Reel caption for testing Vosk transcription.";
    const username = "testuser";

    return {
      url,
      videoUrl: "https://example.com/sample_video.mp4",
      videoPath: filePath,
      caption,
      username,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting Instagram Reel data:', error);
    throw error;
  }
};

/**
 * Download video from URL
 * @param {string} videoUrl - Video URL
 * @param {string} originalUrl - Original Instagram URL
 * @returns {Promise<string>} - Path to downloaded video
 */
const downloadVideo = async (videoUrl, originalUrl) => {
  try {
    // Generate a unique filename based on the URL
    const urlHash = Buffer.from(originalUrl).toString('base64').replace(/[/+=]/g, '');
    const filename = `reel_${urlHash}.mp4`;
    const filePath = path.join(tempDir, filename);

    // Download the video
    const response = await fetch(videoUrl);
    const buffer = await response.buffer();

    // Save the video to disk
    fs.writeFileSync(filePath, buffer);

    return filePath;
  } catch (error) {
    console.error('Error downloading video:', error);
    return '';
  }
};

/**
 * Validate Instagram URL
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether URL is valid
 */
const isValidInstagramUrl = (url) => {
  return url.includes('instagram.com') &&
    (url.includes('/reel/') || url.includes('/p/'));
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
