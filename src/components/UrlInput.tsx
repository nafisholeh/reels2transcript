import { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';

// Types
interface UrlInputProps {
  onSubmit: (url: string, options: ExtractOptions) => Promise<void>;
}

export interface ExtractOptions {
  format: 'plain' | 'json' | 'csv' | 'srt';
  style: 'verbatim' | 'clean' | 'condensed';
  includeTimestamps: boolean;
}

/**
 * Component for inputting Instagram Reel URL with validation
 */
function UrlInput({ onSubmit }: UrlInputProps) {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<ExtractOptions>({
    format: 'plain',
    style: 'clean',
    includeTimestamps: true,
  });

  // Validate URL format
  const isValidUrl = (url: string): boolean => {
    // Basic validation for Instagram URLs
    return url.trim() !== '' && 
      (url.includes('instagram.com/reel') || 
       url.includes('instagram.com/p/'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Validate URL
    if (!isValidUrl(url)) {
      setError('Please enter a valid Instagram Reel URL');
      return;
    }
    
    try {
      setIsLoading(true);
      await onSubmit(url, options);
    } catch (err) {
      setError('An error occurred while processing the URL');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Extract Transcription from Instagram Reel
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Instagram Reel URL"
          placeholder="https://www.instagram.com/reel/..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          margin="normal"
          required
          error={!!error}
          helperText={error || "Paste the URL of the Instagram Reel you want to transcribe"}
          disabled={isLoading}
        />
        
        <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>
          Output Options
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="format-label">Format</InputLabel>
              <Select
                labelId="format-label"
                value={options.format}
                label="Format"
                onChange={(e) => setOptions({
                  ...options,
                  format: e.target.value as ExtractOptions['format']
                })}
                disabled={isLoading}
              >
                <MenuItem value="plain">Plain Text</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
                <MenuItem value="srt">SRT (Subtitles)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="style-label">Transcription Style</InputLabel>
              <Select
                labelId="style-label"
                value={options.style}
                label="Transcription Style"
                onChange={(e) => setOptions({
                  ...options,
                  style: e.target.value as ExtractOptions['style']
                })}
                disabled={isLoading}
              >
                <MenuItem value="verbatim">Verbatim (with filler words)</MenuItem>
                <MenuItem value="clean">Clean (grammar corrected)</MenuItem>
                <MenuItem value="condensed">Condensed (summary)</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="timestamps-label">Include Timestamps</InputLabel>
              <Select
                labelId="timestamps-label"
                value={options.includeTimestamps ? 'yes' : 'no'}
                label="Include Timestamps"
                onChange={(e) => setOptions({
                  ...options,
                  includeTimestamps: e.target.value === 'yes'
                })}
                disabled={isLoading}
              >
                <MenuItem value="yes">Yes</MenuItem>
                <MenuItem value="no">No</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={isLoading}
            sx={{ minWidth: 200 }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                Processing...
              </>
            ) : (
              'Extract Transcription'
            )}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default UrlInput;
