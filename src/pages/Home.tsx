import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';

// Components
import UrlInput from '../components/UrlInput';
import TranscriptionResult from '../components/TranscriptionResult';
import { ExtractOptions } from '../components/UrlInput';

// Services
import { extractSingleTranscription } from '../services/api';

// Types
import { TranscriptionResult as TranscriptionResultType, ApiResponse } from '../types';

/**
 * Home page component with single URL extraction functionality
 */
function Home() {
  const [result, setResult] = useState<TranscriptionResultType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<string>('plain');

  // Handle URL submission
  const handleSubmit = async (url: string, options: ExtractOptions) => {
    try {
      setError(null);
      setFormat(options.format);

      // Call the API to extract transcription
      const response = await extractSingleTranscription(url, options);

      // Debug log the response
      console.log('API Response:', response);

      // Set the result
      if (response && response.success) {
        console.log('Setting result data:', response.data);

        // Check if transcription text exists
        if (!response.data.transcription) {
          console.warn('Transcription text is empty or missing');
        }

        setResult(response.data);
      } else {
        console.error('API response indicates failure:', response);
        throw new Error('Failed to extract transcription');
      }
    } catch (err) {
      console.error('Error extracting transcription:', err);
      let errorMessage = 'An error occurred while extracting the transcription';

      if (err instanceof Error) {
        errorMessage = err.message;
      }

      // Handle axios error
      const axiosError = err as { response?: { data?: { message?: string } } };
      if (axiosError.response?.data?.message) {
        errorMessage = axiosError.response.data.message;
      }

      setError(errorMessage);
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Instagram Reels Transcription Extractor
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Extract speech transcriptions and captions from Instagram Reels
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <UrlInput onSubmit={handleSubmit} />

      {result && (
        <TranscriptionResult result={result} format={format} />
      )}

      <Grid container spacing={3} sx={{ mt: 4 }}>
        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Extract Transcriptions
            </Typography>
            <Typography variant="body2">
              Get accurate speech transcriptions from Instagram Reels. Our tool processes the audio and converts it to text, making it easy to repurpose content.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Extract Captions
            </Typography>
            <Typography variant="body2">
              Capture the original captions from Instagram Reels, including hashtags and mentions. Perfect for content analysis and research.
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={2} sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              Multiple Output Formats
            </Typography>
            <Typography variant="body2">
              Choose from various output formats including plain text, JSON, CSV, and SRT for subtitles. Customize the transcription style to fit your needs.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default Home;
