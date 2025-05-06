#!/usr/bin/env node

/**
 * Instagram Login Script
 * This script helps users log in to Instagram using Instaloader to create a session file.
 * The session file can then be used by other scripts to access Instagram content.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import readline from 'readline';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Promisify exec for async/await usage
const execPromise = promisify(exec);

// Get current file path (ES modules)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the Python login script
const LOGIN_SCRIPT_PATH = path.join(__dirname, 'server/utils/insta_login.py');

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true
});

// Promisify readline.question
const question = (query) => new Promise((resolve) => {
  process.stdout.write(query);
  rl.question('', resolve);
});

/**
 * Check if the Python script exists
 * @returns {Promise<boolean>} - Whether the script exists
 */
async function checkScriptExists() {
  try {
    const { stdout, stderr } = await execPromise(`python3 -c "import instaloader"`);
    return true;
  } catch (error) {
    console.error('Error: Instaloader is not installed.');
    console.error('Please install it with: pip3 install instaloader');
    return false;
  }
}

/**
 * Check if a session file exists and is valid
 * @returns {Promise<boolean>} - Whether the session is valid
 */
async function checkSession() {
  try {
    console.log('Checking if you already have a valid Instagram session...');
    const { stdout, stderr } = await execPromise(`python3 "${LOGIN_SCRIPT_PATH}" --check`);

    console.log(stdout);

    // Check if the session is valid
    return stdout.includes('Session is valid');
  } catch (error) {
    console.error('Error checking session:', error.message);
    return false;
  }
}

/**
 * Log in to Instagram
 * @param {string} username - Instagram username
 * @returns {Promise<boolean>} - Whether login was successful
 */
async function loginToInstagram(username) {
  try {
    console.log(`Logging in to Instagram as ${username}...`);
    console.log('You will be prompted for your password (it will not be stored)');

    // Capture the output to check for success/failure messages
    let output = '';
    let errorOutput = '';

    // Run the Python login script
    const child = exec(`python3 "${LOGIN_SCRIPT_PATH}" --username "${username}"`);

    // Capture stdout and stderr
    child.stdout.on('data', (data) => {
      const str = data.toString();
      output += str;
      process.stdout.write(str); // Still show output to user
    });

    child.stderr.on('data', (data) => {
      const str = data.toString();
      errorOutput += str;
      process.stderr.write(str); // Still show errors to user
    });

    // Wait for the child process to exit
    const exitCode = await new Promise((resolve) => {
      child.on('exit', resolve);
    });

    // Check for success or error messages in the output
    const isSuccess = output.includes('Login successful!');
    const hasError = output.includes('Error:') ||
                    output.includes('error during login') ||
                    output.includes('failed') ||
                    errorOutput.length > 0;

    if (isSuccess && !hasError) {
      return true;
    } else if (hasError) {
      // Don't print additional error message as the Python script already did
      return false;
    } else {
      // If we can't determine success/failure from output, use exit code
      return exitCode === 0;
    }
  } catch (error) {
    console.error('Error launching login process:', error.message);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Instagram Login Script');
    console.log('======================');
    console.log('This script helps you log in to Instagram to create a session file.');
    console.log('The session file will be used by the Instagram scripts to access content.');
    console.log('');

    // Check if the Python script exists
    const scriptExists = await checkScriptExists();
    if (!scriptExists) {
      rl.close();
      return;
    }

    // Check if a session file exists and is valid
    const sessionValid = await checkSession();

    if (sessionValid) {
      console.log('You already have a valid Instagram session.');
      const answer = await question('Do you want to create a new session anyway? (y/n): ');

      if (answer.toLowerCase() !== 'y') {
        console.log('Keeping existing session. You can now use the Instagram scripts.');
        rl.close();
        return;
      }
    }

    // Get username
    const username = await question('Enter your Instagram username: ');

    if (!username) {
      console.error('Error: Username cannot be empty.');
      rl.close();
      return;
    }

    // Log in to Instagram
    const loginSuccess = await loginToInstagram(username);

    if (loginSuccess) {
      console.log('Login successful! You can now use the Instagram scripts.');
    } else {
      console.error('Login failed. Please try again.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    rl.close();
  }
}

// Run the main function
main();
