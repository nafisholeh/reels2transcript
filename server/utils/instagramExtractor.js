import puppeteer from 'puppeteer';
import cheerio from 'cheerio';
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

    // Launch browser
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Navigate to the Instagram Reel URL
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
      
      // Wait for content to load
      await page.waitForSelector('video', { timeout: 10000 }).catch(() => {
        console.log('Video element not found, continuing anyway');
      });
      
      // Get page content
      const content = await page.content();
      
      // Parse HTML with cheerio
      const $ = cheerio.load(content);
      
      // Extract video URL
      let videoUrl = '';
      const videoElements = $('video');
      if (videoElements.length > 0) {
        videoUrl = $(videoElements[0]).attr('src');
      }
      
      if (!videoUrl) {
        // Try to extract from script tags if not found in video element
        const scripts = $('script[type="application/ld+json"]');
        for (let i = 0; i < scripts.length; i++) {
          try {
            const scriptContent = $(scripts[i]).html();
            const jsonData = JSON.parse(scriptContent);
            if (jsonData && jsonData.contentUrl) {
              videoUrl = jsonData.contentUrl;
              break;
            }
          } catch (e) {
            console.error('Error parsing script content:', e);
          }
        }
      }
      
      // Extract caption
      let caption = '';
      const captionElements = $('div[class*="caption"]');
      if (captionElements.length > 0) {
        caption = $(captionElements[0]).text().trim();
      }
      
      if (!caption) {
        // Try alternative selectors for caption
        const altCaptionElements = $('span[class*="caption"]');
        if (altCaptionElements.length > 0) {
          caption = $(altCaptionElements[0]).text().trim();
        }
      }
      
      // If still no caption, try to extract from meta tags
      if (!caption) {
        const metaDescription = $('meta[property="og:description"]').attr('content');
        if (metaDescription) {
          caption = metaDescription;
        }
      }
      
      // Extract username
      let username = '';
      const usernameElements = $('a[class*="username"]');
      if (usernameElements.length > 0) {
        username = $(usernameElements[0]).text().trim();
      }
      
      // If no username found, try to extract from URL
      if (!username) {
        const urlParts = url.split('/');
        const indexOfP = urlParts.indexOf('p');
        if (indexOfP > 0 && indexOfP - 2 >= 0) {
          username = urlParts[indexOfP - 2];
        }
      }
      
      // Download video if URL is available
      let videoPath = '';
      if (videoUrl) {
        videoPath = await downloadVideo(videoUrl, url);
      }
      
      return {
        url,
        videoUrl,
        videoPath,
        caption,
        username,
        timestamp: new Date().toISOString()
      };
    } finally {
      await browser.close();
    }
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
