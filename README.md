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
- Speech Recognition: Transcription processing

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
   ```
   git clone https://github.com/nafisholeh/reels2transcript.git
   cd reels2transcript
   ```

2. Install dependencies
   ```
   npm install
   ```

3. Start the development server
   ```
   npm run dev
   ```

## Usage

1. Enter an Instagram Reel URL in the input field
2. Select your preferred output format and transcription style
3. Click "Extract" to process the Reel
4. View and download the transcription

## License

This project is licensed under the MIT License - see the LICENSE file for details.
