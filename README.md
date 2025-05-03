# Instagram Reels Transcription Extractor

A web application that allows users to extract speech transcriptions and captions from Instagram Reels by simply providing the URL. The application supports both single and bulk extraction, with options to customize the output format of transcriptions.

## Features

- Extract speech transcription from Instagram Reels
- Extract captions from Reels
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

3. Set up Vosk for speech recognition
   ```
   npm run setup:vosk
   ```

   This will:
   - Install the required Python packages (vosk, pyaudio)
   - Download and extract the small Vosk English model

   For better accuracy, you can install the larger model (1.8GB):
   ```
   npm run setup:vosk-large
   ```

   The application will automatically use the large model if available, and fall back to the small model if not.

4. Start the development server
   ```
   npm run dev:all
   ```

## Usage

1. Enter an Instagram Reel URL in the input field
2. Select your preferred output format and transcription style
3. Click "Extract" to process the Reel
4. View and download the transcription

## License

This project is licensed under the MIT License - see the LICENSE file for details.
