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
  console.error('Usage: node playAudio.js <path-to-wav-file>');
  process.exit(1);
}

// Get file path from command line arguments
const filePath = process.argv[2];

// Check if file exists
if (!fs.existsSync(filePath)) {
  console.error(`File not found: ${filePath}`);
  process.exit(1);
}

console.log(`Playing audio file: ${filePath}`);

// Determine which command to use based on platform
const platform = process.platform;
let command;
let args;

if (platform === 'darwin') {
  // macOS
  command = 'afplay';
  args = [filePath];
} else if (platform === 'win32') {
  // Windows
  command = 'powershell';
  args = ['-c', `(New-Object System.Media.SoundPlayer "${filePath}").PlaySync()`];
} else {
  // Linux and others
  command = 'aplay';
  args = [filePath];
}

// Play the audio file
const player = spawn(command, args);

player.stdout.on('data', (data) => {
  console.log(`stdout: ${data}`);
});

player.stderr.on('data', (data) => {
  console.error(`stderr: ${data}`);
});

player.on('close', (code) => {
  console.log(`Audio playback finished with code ${code}`);
});

player.on('error', (err) => {
  console.error(`Failed to start audio player: ${err}`);
  console.error('You may need to install an audio player for your platform:');
  console.error('- macOS: afplay (built-in)');
  console.error('- Windows: PowerShell (built-in)');
  console.error('- Linux: aplay (install with: sudo apt-get install alsa-utils)');
});
