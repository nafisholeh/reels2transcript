import { useState, useRef } from 'react';
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
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import { styled } from '@mui/material/styles';
import { ExtractOptions } from './UrlInput';

// Types
interface BulkUrlInputProps {
  onSubmit: (urls: string[], options: ExtractOptions) => Promise<void>;
  maxUrls?: number;
}

// Styled component for file input
const VisuallyHiddenInput = styled('input')({
  clip: 'rect(0 0 0 0)',
  clipPath: 'inset(50%)',
  height: 1,
  overflow: 'hidden',
  position: 'absolute',
  bottom: 0,
  left: 0,
  whiteSpace: 'nowrap',
  width: 1,
});

/**
 * Component for bulk inputting Instagram Reel URLs
 */
function BulkUrlInput({ onSubmit, maxUrls = 50 }: BulkUrlInputProps) {
  const [urls, setUrls] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileUploaded, setFileUploaded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [options, setOptions] = useState<ExtractOptions>({
    format: 'plain',
    style: 'clean',
    includeTimestamps: true,
  });

  // Process URLs from text input
  const processUrls = (text: string): string[] => {
    // Split by newlines and filter out empty lines
    return text
      .split('\n')
      .map(url => url.trim())
      .filter(url => url !== '')
      .filter(url => 
        url.includes('instagram.com/reel') || 
        url.includes('instagram.com/p/')
      );
  };

  // Handle file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setUrls(content);
      setFileUploaded(true);
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset error state
    setError(null);
    
    // Process URLs
    const processedUrls = processUrls(urls);
    
    // Validate
    if (processedUrls.length === 0) {
      setError('Please enter at least one valid Instagram Reel URL');
      return;
    }
    
    if (processedUrls.length > maxUrls) {
      setError(`You can process a maximum of ${maxUrls} URLs at once`);
      return;
    }
    
    try {
      setIsLoading(true);
      await onSubmit(processedUrls, options);
    } catch (err) {
      setError('An error occurred while processing the URLs');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Bulk Extract Transcriptions
      </Typography>
      
      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 2 }}>
        <TextField
          fullWidth
          label="Instagram Reel URLs"
          placeholder="https://www.instagram.com/reel/...\nhttps://www.instagram.com/reel/..."
          value={urls}
          onChange={(e) => setUrls(e.target.value)}
          margin="normal"
          required
          error={!!error}
          helperText={error || "Enter one URL per line (maximum 50 URLs)"}
          disabled={isLoading}
          multiline
          rows={6}
        />
        
        <Box sx={{ mt: 2, mb: 3 }}>
          <Button
            component="label"
            variant="outlined"
            startIcon={<CloudUploadIcon />}
            sx={{ mr: 2 }}
          >
            Upload CSV/TXT File
            <VisuallyHiddenInput 
              type="file" 
              accept=".csv,.txt" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
          </Button>
          {fileUploaded && (
            <Typography variant="body2" component="span" color="success.main">
              File uploaded successfully
            </Typography>
          )}
        </Box>
        
        <Typography variant="subtitle1" sx={{ mt: 3, mb: 1 }}>
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
              'Extract Transcriptions'
            )}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
}

export default BulkUrlInput;
