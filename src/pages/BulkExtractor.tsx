import { useState } from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';

// Components
import BulkUrlInput from '../components/BulkUrlInput';
import BulkTranscriptionResults from '../components/BulkTranscriptionResults';
import { ExtractOptions } from '../components/UrlInput';

// Services
import { extractBulkTranscriptions } from '../services/api';

/**
 * Bulk Extractor page component for processing multiple URLs
 */
function BulkExtractor() {
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [format, setFormat] = useState<string>('plain');

  // Handle bulk URL submission
  const handleSubmit = async (urls: string[], options: ExtractOptions) => {
    try {
      setError(null);
      setFormat(options.format);

      // Call the API to extract transcriptions in bulk
      const response = await extractBulkTranscriptions(urls, options);

      // Set the results
      if (response && response.success) {
        setResults(response.data);
      } else {
        throw new Error('Failed to extract transcriptions');
      }
    } catch (err: any) {
      console.error('Error extracting transcriptions:', err);
      setError(err.response?.data?.message || err.message || 'An error occurred');
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Bulk Transcription Extractor
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Process multiple Instagram Reels URLs at once
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <BulkUrlInput onSubmit={handleSubmit} maxUrls={50} />

      {results && results.length > 0 && (
        <BulkTranscriptionResults results={results} format={format} />
      )}

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          How to Use Bulk Extraction
        </Typography>

        <Typography variant="body1" paragraph>
          The bulk extraction feature allows you to process up to 50 Instagram Reels URLs at once, saving you time when working with multiple videos.
        </Typography>

        <Typography variant="body2" component="div" sx={{ mb: 2 }}>
          <ol>
            <li>Enter one Instagram Reel URL per line in the text area</li>
            <li>Alternatively, upload a CSV or TXT file containing the URLs</li>
            <li>Select your preferred output format and transcription style</li>
            <li>Click "Extract Transcriptions" to process all URLs</li>
            <li>Download individual results or all results at once</li>
          </ol>
        </Typography>

        <Typography variant="body2" color="text.secondary">
          Note: Processing multiple URLs may take longer depending on the number of URLs and the length of the videos.
        </Typography>
      </Box>
    </Box>
  );
}

export default BulkExtractor;
