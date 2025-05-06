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

// Path to the Vosk models
const MODELS = {
  small: path.join(process.cwd(), 'models/vosk-model-en-us-small'),
  large: path.join(process.cwd(), 'models/vosk-model-en-us-large')
};

// Default to large model for better accuracy, fallback to small if large not available
const getModelPath = () => {
  console.log(`Checking for large model at: ${MODELS.large}`);
  console.log(`Checking for small model at: ${MODELS.small}`);

  if (fs.existsSync(MODELS.large)) {
    console.log('Large model found');
    return MODELS.large;
  } else if (fs.existsSync(MODELS.small)) {
    console.log('Large model not found, falling back to small model');
    return MODELS.small;
  } else {
    console.error('No Vosk models found at the expected paths');
    throw new Error('No Vosk models found. Please download a model first.');
  }
};

// Path to the Python script
const PYTHON_SCRIPT_PATH = path.join(__dirname, 'vosk_transcribe.py');
console.log(`Python script path: ${PYTHON_SCRIPT_PATH}`);

// Maximum number of retries for transcription
const MAX_RETRIES = 3;

// Delay between retries (in milliseconds)
const RETRY_DELAY = 1000;

/**
 * Transcribe audio using Vosk
 * @param {string} audioPath - Path to audio file
 * @param {Object} options - Transcription options
 * @returns {Promise<Object>} - Transcription result
 */
export const transcribeAudioWithVosk = async (audioPath, options = {}) => {
  let retryCount = 0;
  let lastError = null;

  // Get the model path
  const modelPath = getModelPath();

  while (retryCount < MAX_RETRIES) {
    try {
      // Validate audio file
      if (!fs.existsSync(audioPath)) {
        throw new Error({
          code: 'FILE_NOT_FOUND',
          message: `Audio file not found at path: ${audioPath}`
        });
      }

      // Check if Python script exists
      if (!fs.existsSync(PYTHON_SCRIPT_PATH)) {
        throw new Error({
          code: 'SCRIPT_NOT_FOUND',
          message: `Python script not found at ${PYTHON_SCRIPT_PATH}`
        });
      }

      console.log(`Transcribing audio with Vosk (attempt ${retryCount + 1}/${MAX_RETRIES})`);
      console.log(`Using model: ${modelPath}`);

      // Create output path for transcription
      const outputPath = path.join(tempDir, `transcription_${Date.now()}.json`);

      // Run Python script to transcribe audio
      const result = await runPythonTranscription(audioPath, outputPath, modelPath);

      // Check if result is empty or has an error
      if (result.error) {
        throw new Error({
          code: 'TRANSCRIPTION_ERROR',
          message: result.error
        });
      }

      // Format the result based on options
      const formattedResult = formatTranscription(result, options);

      // Clean up the output file
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);
      }

      return formattedResult;
    } catch (error) {
      lastError = error;
      retryCount++;

      // Log the error with specific details
      console.error(`Transcription attempt ${retryCount}/${MAX_RETRIES} failed:`, error);

      if (retryCount < MAX_RETRIES) {
        console.log(`Retrying in ${RETRY_DELAY/1000} seconds...`);
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
    }
  }

  // All retries failed, return error response
  console.error(`All ${MAX_RETRIES} transcription attempts failed.`);
  console.error('Last error:', lastError);

  return transcriptionErrorResponse(options, lastError);
};

/**
 * Run Python script to transcribe audio
 * @param {string} audioPath - Path to audio file
 * @param {string} outputPath - Path to save transcription
 * @param {string} modelPath - Path to Vosk model
 * @returns {Promise<Object>} - Transcription result
 */
const runPythonTranscription = async (audioPath, outputPath, modelPath) => {
  return new Promise((resolve, reject) => {
    try {
      // Command to run Python script
      const cwd = process.cwd();
      const command = `cd "${cwd}" && python3 "${PYTHON_SCRIPT_PATH}" "${audioPath}" --model "${modelPath}" --output "${outputPath}"`;

      console.log(`Running command: ${command}`);
      console.log(`Current working directory: ${cwd}`);

      // Execute the command with a timeout
      const childProcess = exec(command, { timeout: 60000 }, (error, stdout, stderr) => {
        if (error) {
          // Categorize the error
          let errorType = 'UNKNOWN_ERROR';
          let errorMessage = error.message;

          if (error.code === 'ETIMEDOUT') {
            errorType = 'TIMEOUT_ERROR';
            errorMessage = 'Transcription process timed out after 60 seconds';
          } else if (error.code === 'ENOENT') {
            errorType = 'COMMAND_NOT_FOUND';
            errorMessage = 'Python or required command not found';
          } else if (stderr && stderr.includes('ModuleNotFoundError')) {
            errorType = 'MODULE_ERROR';
            errorMessage = 'Python module not found. Please install required dependencies';
          } else if (stderr && stderr.includes('PermissionError')) {
            errorType = 'PERMISSION_ERROR';
            errorMessage = 'Permission denied when accessing files';
          }

          console.error(`Error executing Python script (${errorType}): ${errorMessage}`);
          console.error(`stderr: ${stderr}`);

          return reject({
            code: errorType,
            message: errorMessage,
            details: stderr
          });
        }

        // Log stderr as debug information
        if (stderr) {
          console.log(`Python script logs: ${stderr}`);
        }

        try {
          // Parse the output - stdout should now contain only the JSON result
          const trimmedOutput = stdout.trim();
          if (!trimmedOutput) {
            console.warn('Empty output from Python script');
            return reject({
              code: 'EMPTY_OUTPUT',
              message: 'Python script returned empty output',
              details: stderr
            });
          }

          const result = JSON.parse(trimmedOutput);

          console.log('Parsed JSON result from Python script:', JSON.stringify(result, null, 2));

          // Check for errors
          if (result.error) {
            const errorMessage = `Python script error: ${result.error}`;
            console.error(errorMessage);
            return reject({
              code: 'PYTHON_SCRIPT_ERROR',
              message: errorMessage,
              details: result.error
            });
          }

          // Check if result is empty
          if (!result.text && (!result.result || result.result.length === 0)) {
            console.warn('Transcription result is empty. Audio might not contain speech.');

            // Ensure result has a text property even if empty
            result.text = result.text || '';
          }

          resolve(result);
        } catch (parseError) {
          const errorMessage = `Error parsing Python script output: ${parseError.message}`;
          console.error(errorMessage);
          console.error(`stdout: ${stdout}`);

          reject({
            code: 'PARSE_ERROR',
            message: errorMessage,
            details: stdout
          });
        }
      });

      // Handle process errors
      childProcess.on('error', (err) => {
        console.error(`Process error: ${err.message}`);
        reject({
          code: 'PROCESS_ERROR',
          message: `Process error: ${err.message}`,
          details: err
        });
      });
    } catch (error) {
      console.error(`Error running Python script: ${error.message}`);
      reject({
        code: 'EXECUTION_ERROR',
        message: `Error running Python script: ${error.message}`,
        details: error
      });
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
    console.log('Formatting transcription result:', JSON.stringify(result));

    // Validate result
    if (!result) {
      console.error('Invalid transcription result: result is null or undefined');
      return transcriptionErrorResponse(options, new Error('Invalid transcription result: result is null or undefined'));
    }

    // Extract text from result
    let text = '';
    if (result.text && result.text.trim() !== '') {
      text = result.text;
      console.log('Using text from result.text:', text);
    } else if (result.alternatives && result.alternatives.length > 0) {
      text = result.alternatives[0].text;
      console.log('Using text from result.alternatives:', text);
    } else if (result.result && result.result.length > 0) {
      // Construct text from segments if text field is empty
      console.log('Constructing text from segments');

      // Sort segments by start time
      const sortedSegments = [...result.result].sort((a, b) => a.start - b.start);

      // Join words from segments
      text = sortedSegments.map(segment => segment.word).join(' ');
      console.log(`Constructed text from ${sortedSegments.length} segments: "${text}"`);
    }

    // Always check if we need to construct text from segments
    if ((!text || text.trim() === '') && result.result && result.result.length > 0) {
      console.log('Text is still empty, constructing from segments as fallback');
      const sortedSegments = [...result.result].sort((a, b) => a.start - b.start);
      text = sortedSegments.map(segment => segment.word).join(' ');
      console.log(`Constructed text from ${sortedSegments.length} segments: "${text}"`);
    }

    // If text is still empty, return error
    if (!text || text.trim() === '') {
      console.log('Empty transcription result, returning error');
      return transcriptionErrorResponse(options, new Error('No speech detected in audio'));
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
    if (options.includeTimestamps && result.result && result.result.length > 0) {
      formattedText = addTimestamps(formattedText, result.result);
    }

    // Create the formatted result
    const formattedResult = {
      text: formattedText || '',  // Ensure text is never undefined
      language: 'en-US',
      timestamps: options.includeTimestamps,
      style: style,
      segments: result.result || [],
      model: options.model || 'vosk'
    };

    // CRITICAL FIX: If text is still empty but we have segments, force construction from segments
    if ((!formattedResult.text || formattedResult.text.trim() === '') && formattedResult.segments && formattedResult.segments.length > 0) {
      console.log('CRITICAL: Text is still empty but segments exist. Forcing text construction from segments.');
      // Sort segments by start time
      const sortedSegments = [...formattedResult.segments].sort((a, b) => a.start - b.start);
      // Join words from segments
      formattedResult.text = sortedSegments.map(segment => segment.word).join(' ');
      console.log(`Forced text construction from ${sortedSegments.length} segments: "${formattedResult.text}"`);

      // Apply style to the constructed text
      if (style === 'clean') {
        formattedResult.text = cleanTranscription(formattedResult.text);
      } else if (style === 'condensed') {
        formattedResult.text = condensedTranscription(formattedResult.text);
      }
    }

    // Log the formatted result for debugging
    console.log('Formatted transcription result:', JSON.stringify(formattedResult, null, 2));

    // Add confidence score if available
    if (result.result && result.result.length > 0) {
      // Calculate average confidence score
      const confidenceSum = result.result.reduce((sum, segment) => sum + (segment.conf || 0), 0);
      const averageConfidence = confidenceSum / result.result.length;
      formattedResult.confidence = parseFloat(averageConfidence.toFixed(2));
    }

    return formattedResult;
  } catch (error) {
    console.error('Error formatting transcription:', error);

    // Return a basic result with error information
    return {
      text: result && result.text ? result.text : '',
      language: 'en-US',
      timestamps: options.includeTimestamps,
      style: options.style || 'clean',
      segments: [],
      error: {
        message: `Error formatting transcription: ${error.message}`,
        details: error
      }
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
 * Error response when transcription fails
 * @param {Object} options - Transcription options
 * @param {Error} error - The error that caused the failure
 * @returns {Object} - Error response
 */
const transcriptionErrorResponse = (options = {}, error = null) => {
  console.log('Transcription failed, returning error response');

  // Create the error result object
  const result = {
    text: '',
    language: 'en-US',
    timestamps: options.includeTimestamps || false,
    style: options.style || 'clean',
    segments: [],
    error: {
      message: 'Transcription failed. Unable to process audio.',
      details: error ? error.message || String(error) : 'Unknown error',
      code: 'TRANSCRIPTION_FAILED'
    }
  };

  // Log the error result for debugging
  console.log('Transcription error response:', JSON.stringify(result, null, 2));

  return result;
};

/**
 * Extract audio from video file with multiple fallback methods
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
export const extractAudioFromVideo = async (videoPath) => {
  // Maximum number of retries
  const MAX_RETRIES = 3;
  // Different extraction methods to try
  const extractionMethods = [
    extractAudioMethod1,
    extractAudioMethod2,
    extractAudioMethod3
  ];

  let lastError = null;

  // Try each method in sequence
  for (let i = 0; i < extractionMethods.length; i++) {
    const extractMethod = extractionMethods[i];
    console.log(`Trying audio extraction method ${i + 1}/${extractionMethods.length}...`);

    try {
      const audioPath = await extractMethod(videoPath);
      if (audioPath && fs.existsSync(audioPath)) {
        const stats = fs.statSync(audioPath);
        if (stats.size > 0) {
          console.log(`Audio extraction successful with method ${i + 1}`);
          console.log(`Audio file size: ${stats.size} bytes`);
          return audioPath;
        } else {
          console.warn(`Method ${i + 1} produced an empty audio file, trying next method...`);
        }
      }
    } catch (error) {
      console.error(`Method ${i + 1} failed:`, error.message);
      lastError = error;
      // Continue to the next method
    }
  }

  // If all methods failed, throw the last error
  throw lastError || new Error('All audio extraction methods failed');
};

/**
 * First method: Standard FFmpeg extraction
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
const extractAudioMethod1 = (videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      if (!videoPath || !fs.existsSync(videoPath)) {
        reject(new Error(`Video file not found at path: ${videoPath}`));
        return;
      }

      // Check if the video file is valid
      const stats = fs.statSync(videoPath);
      if (stats.size === 0) {
        reject(new Error(`Video file is empty: ${videoPath}`));
        return;
      }

      console.log(`Method 1: Extracting audio from video: ${videoPath}`);
      console.log(`Video file size: ${stats.size} bytes`);

      const audioFilename = path.basename(videoPath, path.extname(videoPath)) + '.wav';
      const audioPath = path.join(tempDir, audioFilename);

      // Standard FFmpeg command
      const ffmpegProcess = spawn('ffmpeg', [
        '-y',                   // Overwrite output files without asking
        '-i', videoPath,        // Input file
        '-vn',                  // Disable video
        '-acodec', 'pcm_s16le', // Audio codec (PCM 16-bit little-endian)
        '-ar', '16000',         // Audio sample rate (16kHz)
        '-ac', '1',             // Audio channels (mono)
        '-f', 'wav',            // Output format
        audioPath               // Output file
      ]);

      let ffmpegError = '';

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        ffmpegError += output;
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          // Verify the output file exists and is not empty
          if (fs.existsSync(audioPath)) {
            const audioStats = fs.statSync(audioPath);
            if (audioStats.size > 0) {
              console.log(`Method 1: Audio extracted successfully to: ${audioPath}`);
              resolve(audioPath);
            } else {
              reject(new Error('Method 1: Extracted audio file is empty'));
            }
          } else {
            reject(new Error('Method 1: Audio file was not created'));
          }
        } else {
          console.error(`Method 1: FFmpeg process exited with code ${code}`);
          reject(new Error(`Method 1: FFmpeg process exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        reject(new Error(`Method 1: Failed to start FFmpeg process: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Method 1: Error in extraction: ${error.message}`));
    }
  });
};

/**
 * Second method: FFmpeg with alternative options
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
const extractAudioMethod2 = (videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Method 2: Extracting audio with alternative options from: ${videoPath}`);

      const audioFilename = path.basename(videoPath, path.extname(videoPath)) + '_alt.wav';
      const audioPath = path.join(tempDir, audioFilename);

      // Alternative FFmpeg command with different options
      const ffmpegProcess = spawn('ffmpeg', [
        '-y',                   // Overwrite output files without asking
        '-i', videoPath,        // Input file
        '-vn',                  // Disable video
        '-acodec', 'pcm_s16le', // Audio codec (PCM 16-bit little-endian)
        '-ar', '16000',         // Audio sample rate (16kHz)
        '-ac', '1',             // Audio channels (mono)
        '-af', 'aresample=async=1', // Add audio resampling with async mode
        '-f', 'wav',            // Output format
        audioPath               // Output file
      ]);

      let ffmpegError = '';

      ffmpegProcess.stderr.on('data', (data) => {
        const output = data.toString();
        ffmpegError += output;
      });

      ffmpegProcess.on('close', (code) => {
        if (code === 0) {
          if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
            console.log(`Method 2: Audio extracted successfully to: ${audioPath}`);
            resolve(audioPath);
          } else {
            reject(new Error('Method 2: Extracted audio file is empty or not created'));
          }
        } else {
          console.error(`Method 2: FFmpeg process exited with code ${code}`);
          reject(new Error(`Method 2: FFmpeg process exited with code ${code}`));
        }
      });

      ffmpegProcess.on('error', (err) => {
        reject(new Error(`Method 2: Failed to start FFmpeg process: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Method 2: Error in extraction: ${error.message}`));
    }
  });
};

/**
 * Third method: FFmpeg with copy codec
 * @param {string} videoPath - Path to video file
 * @returns {Promise<string>} - Path to extracted audio file
 */
const extractAudioMethod3 = (videoPath) => {
  return new Promise((resolve, reject) => {
    try {
      console.log(`Method 3: Extracting audio with copy codec from: ${videoPath}`);

      // First extract with copy codec to preserve original audio
      const tempAudioFilename = path.basename(videoPath, path.extname(videoPath)) + '_temp.aac';
      const tempAudioPath = path.join(tempDir, tempAudioFilename);

      // Final WAV file path
      const audioFilename = path.basename(videoPath, path.extname(videoPath)) + '_copy.wav';
      const audioPath = path.join(tempDir, audioFilename);

      // Two-step process: first extract audio with copy codec
      const ffmpegProcess1 = spawn('ffmpeg', [
        '-y',                   // Overwrite output files without asking
        '-i', videoPath,        // Input file
        '-vn',                  // Disable video
        '-acodec', 'copy',      // Copy audio codec (no re-encoding)
        tempAudioPath           // Temporary output file
      ]);

      let ffmpegError1 = '';

      ffmpegProcess1.stderr.on('data', (data) => {
        ffmpegError1 += data.toString();
      });

      ffmpegProcess1.on('close', (code) => {
        if (code === 0 && fs.existsSync(tempAudioPath) && fs.statSync(tempAudioPath).size > 0) {
          console.log(`Method 3: Temporary audio extracted to: ${tempAudioPath}`);

          // Second step: convert to WAV with required parameters
          const ffmpegProcess2 = spawn('ffmpeg', [
            '-y',                   // Overwrite output files without asking
            '-i', tempAudioPath,    // Input file (the temporary audio)
            '-acodec', 'pcm_s16le', // Audio codec (PCM 16-bit little-endian)
            '-ar', '16000',         // Audio sample rate (16kHz)
            '-ac', '1',             // Audio channels (mono)
            audioPath               // Final output file
          ]);

          let ffmpegError2 = '';

          ffmpegProcess2.stderr.on('data', (data) => {
            ffmpegError2 += data.toString();
          });

          ffmpegProcess2.on('close', (code2) => {
            // Clean up temporary file
            try {
              if (fs.existsSync(tempAudioPath)) {
                fs.unlinkSync(tempAudioPath);
              }
            } catch (e) {
              console.warn(`Could not delete temporary file: ${tempAudioPath}`, e);
            }

            if (code2 === 0) {
              if (fs.existsSync(audioPath) && fs.statSync(audioPath).size > 0) {
                console.log(`Method 3: Audio converted successfully to: ${audioPath}`);
                resolve(audioPath);
              } else {
                reject(new Error('Method 3: Converted audio file is empty or not created'));
              }
            } else {
              console.error(`Method 3: Second FFmpeg process exited with code ${code2}`);
              reject(new Error(`Method 3: Second FFmpeg process exited with code ${code2}`));
            }
          });

          ffmpegProcess2.on('error', (err) => {
            reject(new Error(`Method 3: Failed to start second FFmpeg process: ${err.message}`));
          });
        } else {
          console.error(`Method 3: First FFmpeg process exited with code ${code}`);
          reject(new Error(`Method 3: First FFmpeg process exited with code ${code}`));
        }
      });

      ffmpegProcess1.on('error', (err) => {
        reject(new Error(`Method 3: Failed to start first FFmpeg process: ${err.message}`));
      });
    } catch (error) {
      reject(new Error(`Method 3: Error in extraction: ${error.message}`));
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
