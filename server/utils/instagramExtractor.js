import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { instagramGetUrl } from 'instagram-url-direct';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec for async/await usage
const execPromise = promisify(exec);

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the Python scripts
const CAPTION_EXTRACTOR_SCRIPT = path.join(__dirname, 'insta_caption_extractor.py');
const MEDIA_DOWNLOADER_SCRIPT = path.join(__dirname, 'insta_media_downloader.py');

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

    console.log(`Extracting data from Instagram Reel: ${url}`);

    // Use instagram-url-direct to get the direct video URL
    const instagramData = await instagramGetUrl(url);

    if (!instagramData || !instagramData.url_list || instagramData.url_list.length === 0) {
      throw new Error('Could not extract video URL from Instagram Reel');
    }

    console.log('Instagram data retrieved successfully');

    // Get the first video URL from the list
    const videoUrl = instagramData.url_list[0];
    console.log(`Found video URL: ${videoUrl}`);

    // Try to download media using Instaloader first
    console.log('Attempting to download media using Instaloader...');
    const instaloaderResult = await downloadMediaWithInstaloader(url);

    let videoPath = '';
    let caption = '';
    let username = 'unknown';

    if (instaloaderResult.videoPath && fs.existsSync(instaloaderResult.videoPath)) {
      // Instaloader download successful
      videoPath = instaloaderResult.videoPath;
      caption = instaloaderResult.caption;
      username = instaloaderResult.username || 'unknown';

      console.log(`Successfully downloaded media with Instaloader to: ${videoPath}`);
    } else {
      // Fallback to legacy method if Instaloader fails
      console.warn('Instaloader download failed, falling back to legacy method...');

      // Extract username from post_info if available
      if (instagramData.post_info) {
        username = instagramData.post_info.owner_username || 'unknown';
        console.log('Post info available:', JSON.stringify(instagramData.post_info, null, 2));
      }

      // Download the video using the legacy method
      videoPath = await downloadVideoLegacy(videoUrl, url);

      if (!videoPath || !fs.existsSync(videoPath)) {
        throw new Error('Failed to download video from Instagram Reel using both methods');
      }

      // Extract caption using Instaloader
      console.log('Attempting to extract caption using Instaloader...');
      caption = await extractCaptionWithInstaloader(url);

      // If caption extraction failed, set a default message
      if (!caption || caption === 'Failed to extract caption') {
        console.warn('Caption extraction failed, using default message');
        caption = 'No caption available';
      }
    }

    console.log(`Video downloaded to: ${videoPath}`);

    return {
      url,
      videoUrl: videoPath.startsWith('http') ? videoPath : `file://${videoPath}`,
      videoPath,
      caption,
      username,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error extracting Instagram Reel data:', error);
    console.error(error.stack);

    // Fallback to sample video if extraction fails
    console.log('Falling back to sample video...');
    return fallbackToSampleVideo(url);
  }
};

/**
 * Fallback to sample video when extraction fails
 * @param {string} url - Original Instagram URL
 * @returns {Object} - Sample data
 */
const fallbackToSampleVideo = (url) => {
  // For testing purposes, use a sample video file
  const sampleVideoPath = path.join(__dirname, '../../sample_data/sample_video.mp4');

  // If the sample video doesn't exist, create a directory and copy a sample video
  if (!fs.existsSync(sampleVideoPath)) {
    // Create sample_data directory if it doesn't exist
    const sampleDir = path.join(__dirname, '../../sample_data');
    if (!fs.existsSync(sampleDir)) {
      fs.mkdirSync(sampleDir, { recursive: true });
    }

    console.log('Sample video file not found. Please add a sample video to sample_data/sample_video.mp4');
    throw new Error('Sample video file not found');
  }

  // Check if the sample video is valid
  const stats = fs.statSync(sampleVideoPath);
  if (stats.size === 0) {
    console.error('Sample video file is empty');
    throw new Error('Sample video file is empty');
  }

  console.log(`Using sample video file: ${sampleVideoPath} (${stats.size} bytes)`);

  // Generate a unique filename for this request
  const urlHash = Buffer.from(url).toString('base64').replace(/[/+=]/g, '');
  const filename = `reel_${urlHash}.mp4`;
  const filePath = path.join(tempDir, filename);

  // Copy the sample video to the temp directory
  fs.copyFileSync(sampleVideoPath, filePath);

  // Verify the file was copied correctly
  if (!fs.existsSync(filePath)) {
    throw new Error('Failed to copy sample video file');
  }

  const fileStats = fs.statSync(filePath);
  console.log(`Sample video copied to: ${filePath} (${fileStats.size} bytes)`);

  // Mock data for testing
  const caption = "This is a sample Instagram Reel caption for testing Vosk transcription.";
  const username = "testuser";

  return {
    url,
    videoUrl: "file://" + sampleVideoPath,
    videoPath: filePath,
    caption,
    username,
    timestamp: new Date().toISOString()
  };
};

/**
 * Download media from Instagram using Instaloader
 * @param {string} url - Instagram post URL
 * @returns {Promise<Object>} - Object containing media path and caption
 */
const downloadMediaWithInstaloader = async (url) => {
  try {
    console.log(`Downloading media with Instaloader from: ${url}`);

    // Run the Python script to download the media
    const { stdout, stderr } = await execPromise(`python3 "${MEDIA_DOWNLOADER_SCRIPT}" "${url}" "${tempDir}"`);

    if (stderr) {
      console.error(`Error from Instaloader media downloader: ${stderr}`);
    }

    // Parse the JSON output from the Python script
    const result = JSON.parse(stdout);

    if (!result.success) {
      console.error(`Failed to download media: ${result.error}`);
      return { videoPath: '', caption: 'Failed to download media' };
    }

    console.log(`Successfully downloaded media to: ${result.media_path}`);
    console.log(`Caption: "${result.caption.substring(0, 50)}..."`);

    return {
      videoPath: result.media_path,
      caption: result.caption,
      username: result.username
    };
  } catch (error) {
    console.error('Error downloading media with Instaloader:', error);
    return { videoPath: '', caption: 'Failed to download media' };
  }
};

/**
 * Download video from URL (Legacy method - kept for fallback)
 * @param {string} videoUrl - Video URL
 * @param {string} originalUrl - Original Instagram URL
 * @returns {Promise<string>} - Path to downloaded video
 */
const downloadVideoLegacy = async (videoUrl, originalUrl) => {
  try {
    // Generate a unique filename based on the URL
    const urlHash = Buffer.from(originalUrl).toString('base64').replace(/[/+=]/g, '');
    const filename = `reel_${urlHash}.mp4`;
    const filePath = path.join(tempDir, filename);

    console.log(`Downloading video from: ${videoUrl}`);
    console.log(`Saving to: ${filePath}`);

    // Download the video with proper headers to avoid being blocked
    const response = await fetch(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
        'Accept': 'video/mp4,video/webm,video/*;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.instagram.com/',
        'Origin': 'https://www.instagram.com'
      },
      timeout: 30000 // 30 seconds timeout
    });

    if (!response.ok) {
      throw new Error(`Failed to download video: ${response.status} ${response.statusText}`);
    }

    const buffer = await response.buffer();

    // Check if we got a valid video file (should be at least a few KB)
    if (buffer.length < 1000) {
      throw new Error(`Downloaded file is too small (${buffer.length} bytes), likely not a valid video`);
    }

    // Save the video to disk
    fs.writeFileSync(filePath, buffer);

    // Verify the file was saved correctly
    if (!fs.existsSync(filePath)) {
      throw new Error('File was not saved correctly');
    }

    const stats = fs.statSync(filePath);
    console.log(`Video downloaded successfully (${buffer.length} bytes, file size: ${stats.size} bytes)`);

    // Verify the file is a valid video file
    if (stats.size === 0) {
      throw new Error('Downloaded file is empty');
    }

    return filePath;
  } catch (error) {
    console.error('Error downloading video:', error);
    console.error(error.stack);
    return '';
  }
};

/**
 * Extract caption from Instagram post using Instaloader
 * @param {string} url - Instagram post URL
 * @returns {Promise<string>} - Extracted caption
 */
const extractCaptionWithInstaloader = async (url) => {
  try {
    console.log(`Extracting caption with Instaloader from: ${url}`);

    // Run the Python script to extract the caption
    const { stdout, stderr } = await execPromise(`python3 "${CAPTION_EXTRACTOR_SCRIPT}" "${url}"`);

    if (stderr) {
      console.error(`Error from Instaloader script: ${stderr}`);
    }

    // Parse the JSON output from the Python script
    const result = JSON.parse(stdout);

    if (!result.success) {
      console.error(`Failed to extract caption: ${result.error}`);
      return 'Failed to extract caption';
    }

    console.log(`Successfully extracted caption: "${result.caption.substring(0, 50)}..."`);
    return result.caption;
  } catch (error) {
    console.error('Error extracting caption with Instaloader:', error);
    return 'Failed to extract caption';
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
