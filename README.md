# Instagram Reels Transcription Extractor

A web application that allows users to extract speech transcriptions and captions from Instagram Reels by simply providing the URL. The application supports both single and bulk extraction, with options to customize the output format of transcriptions.

## Features

- Extract speech transcription from Instagram Reels
- Extract captions from Instagram Reels using Instaloader
- Support for bulk URL processing
- Multiple output formats (Plain text, JSON, CSV, SRT)
- Customizable transcription styles
- Download transcriptions in selected format

## Tech Stack

- Frontend: React.js with Material-UI
- Backend: Node.js with Express
- API Integration: Instagram data extraction
- Speech Recognition: Vosk (offline speech recognition)

## Features

- **Offline Speech Recognition**: Uses Vosk for local speech-to-text processing without sending data to external servers
- **Multiple Model Support**: Automatically selects between small (40MB) and large (1.8GB) models based on availability
- **Robust Error Handling**: Implements retry mechanisms and detailed error reporting
- **Customizable Transcription**: Supports different transcription styles (verbatim, clean, condensed)
- **Timestamp Support**: Option to include timestamps in transcriptions

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Python 3.6 or higher
- FFmpeg (for audio extraction)

### Installation

1. Clone the repository
   ```
   git clone https://github.com/nafisholeh/reels2transcript.git
   cd reels2transcript
   ```

2. Install Node.js dependencies
   ```
   npm install
   ```

3. Install Python dependencies for Vosk and Instaloader
   ```
   pip install vosk instaloader
   ```

4. Set up Vosk speech recognition models

   Create a models directory in the project root:
   ```
   mkdir -p models
   ```

   Download and extract the Vosk models:

   **Option 1: Small model (42MB)** - Faster but less accurate
   ```
   # Download the small model
   curl -L -o models/vosk-model-small-en-us-0.15.zip https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip

   # Extract the model
   unzip models/vosk-model-small-en-us-0.15.zip -d models/

   # Rename the folder for easier reference
   mv models/vosk-model-small-en-us-0.15 models/vosk-model-en-us-small
   ```

   **Option 2: Large model (1.8GB)** - More accurate but requires more resources
   ```
   # Download the large model
   curl -L -o models/vosk-model-en-us-0.22.zip https://alphacephei.com/vosk/models/vosk-model-en-us-0.22.zip

   # Extract the model
   unzip models/vosk-model-en-us-0.22.zip -d models/

   # Rename the folder for easier reference
   mv models/vosk-model-en-us-0.22 models/vosk-model-en-us-large
   ```

   The application will automatically use the large model if available, and fall back to the small model if not.

   **Note:** After setup, your models directory should have the following structure:
   ```
   models/
   ├── vosk-model-en-us-large/    # Large model (optional but recommended)
   │   ├── am/
   │   ├── conf/
   │   ├── graph/
   │   ├── ivector/
   │   └── ...
   ├── vosk-model-en-us-small/    # Small model (minimum requirement)
   │   ├── am/
   │   ├── conf/
   │   ├── graph/
   │   ├── ivector/
   │   └── ...
   └── vosk-model-small-en-us-0.15.zip  # Downloaded zip file (can be deleted after extraction)
   ```

5. Start the development server
   ```
   npm run dev:all
   ```

## Usage

1. Enter an Instagram Reel URL in the input field
2. Select your preferred output format and transcription style
3. Click "Extract" to process the Reel
4. View and download the transcription

## Troubleshooting

### Common Issues

#### Empty Transcription Results

If you're getting empty transcription results even though the audio extraction seems to work:

1. Check that the Vosk models are correctly installed in the `models/` directory
2. Verify the audio file is valid by playing it: `node server/utils/playAudio.js path/to/audio.wav`
3. Check the audio file information: `node server/utils/getAudioInfo.js path/to/audio.wav`
4. Try running the transcription directly: `python3 server/utils/vosk_transcribe.py path/to/audio.wav`

#### Model Not Found Error

If you see "Model not found" errors:

1. Make sure you've downloaded and extracted the models as described in the setup instructions
2. Verify the model directory names match exactly: `vosk-model-en-us-small` and `vosk-model-en-us-large`
3. Check that the models are in the correct location (in the `models/` directory at the project root)

#### Audio Extraction Issues

If audio extraction fails:

1. Make sure FFmpeg is installed on your system
2. Check that the Instagram Reel URL is valid and accessible
3. Try downloading the video manually and then extracting the audio

## License

This project is licensed under the MIT License - see the LICENSE file for details.
