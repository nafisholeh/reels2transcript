#!/usr/bin/env node

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Check if file path is provided
if (process.argv.length < 3) {
  console.error('Please provide a path to the WAV file');
  console.error('Usage: node getAudioInfo.js <path-to-wav-file>');
  process.exit(1);
}

// Get file path from command line arguments
const filePath = process.argv[2];

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log(`Getting information for audio file: ${filePath}`);

// Use ffprobe to get audio information
const ffprobe = spawn('ffprobe', [
  '-v', 'error',
  '-show_format',
  '-show_streams',
  filePath
]);

let output = '';

ffprobe.stdout.on('data', (data) => {
  output += data.toString();
});

ffprobe.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

ffprobe.on('close', (code) => {
  if (code === 0) {
    console.log('Audio File Information:');
    console.log(output);
    
    // Get file size
    const stats = fs.statSync(filePath);
    const fileSizeInBytes = stats.size;
    const fileSizeInMB = fileSizeInBytes / (1024 * 1024);
    
    console.log(`File size: ${fileSizeInBytes} bytes (${fileSizeInMB.toFixed(2)} MB)`);
  } else {
    console.error(`ffprobe process exited with code ${code}`);
    console.error('You may need to install ffprobe (part of ffmpeg):');
    console.error('- macOS: brew install ffmpeg');
    console.error('- Windows: Download from https://ffmpeg.org/download.html');
    console.error('- Linux: sudo apt-get install ffmpeg');
  }
});

ffprobe.on('error', (err) => {
  console.error(`Failed to start ffprobe: ${err}`);
});
