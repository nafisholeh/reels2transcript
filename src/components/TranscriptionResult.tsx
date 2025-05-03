import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import DownloadIcon from '@mui/icons-material/Download';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';

// Types
interface TranscriptionResultProps {
  result: {
    url: string;
    transcription: string;
    caption?: string;
    timestamp: string;
    formattedOutput?: {
      text: string;
      format: string;
    };
  };
  format: string;
}

/**
 * Component to display transcription results with download and copy options
 */
function TranscriptionResult({ result, format }: TranscriptionResultProps) {
  const [tabValue, setTabValue] = useState(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Copy to clipboard
  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setSnackbarMessage(`${type} copied to clipboard`);
        setSnackbarOpen(true);
      },
      () => {
        setSnackbarMessage('Failed to copy to clipboard');
        setSnackbarOpen(true);
      }
    );
  };

  // Download as file
  const handleDownload = (content: string, type: string) => {
    const element = document.createElement('a');
    let filename = '';
    let mimeType = '';

    // Use formatted output if available
    if (type === 'Transcription' && result.formattedOutput) {
      content = result.formattedOutput.text;

      // Set filename and mime type based on format
      switch (result.formattedOutput.format) {
        case 'json':
          filename = `${type.toLowerCase()}_${new Date().getTime()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          filename = `${type.toLowerCase()}_${new Date().getTime()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'srt':
          filename = `${type.toLowerCase()}_${new Date().getTime()}.srt`;
          mimeType = 'application/x-subrip';
          break;
        default:
          filename = `${type.toLowerCase()}_${new Date().getTime()}.txt`;
          mimeType = 'text/plain';
      }
    } else {
      // Set filename and mime type based on format
      switch (format) {
        case 'json':
          filename = `${type.toLowerCase()}_${new Date().getTime()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          filename = `${type.toLowerCase()}_${new Date().getTime()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'srt':
          filename = `${type.toLowerCase()}_${new Date().getTime()}.srt`;
          mimeType = 'application/x-subrip';
          break;
        default:
          filename = `${type.toLowerCase()}_${new Date().getTime()}.txt`;
          mimeType = 'text/plain';
      }
    }

    const blob = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setSnackbarMessage(`${type} downloaded as ${filename}`);
    setSnackbarOpen(true);
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Extraction Results
      </Typography>

      <Typography variant="body2" color="text.secondary" gutterBottom>
        Source: {result.url}
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="result tabs">
          <Tab label="Transcription" id="tab-0" />
          {result.caption && <Tab label="Caption" id="tab-1" />}
        </Tabs>
      </Box>

      <div role="tabpanel" hidden={tabValue !== 0}>
        {tabValue === 0 && (
          <Box sx={{ mb: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                maxHeight: '300px',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontFamily: 'monospace'
              }}
            >
              {result.transcription}
            </Paper>

            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                startIcon={<ContentCopyIcon />}
                onClick={() => handleCopy(result.transcription, 'Transcription')}
              >
                Copy
              </Button>
              <Button
                variant="contained"
                startIcon={<DownloadIcon />}
                onClick={() => handleDownload(result.transcription, 'Transcription')}
              >
                Download
              </Button>
            </Box>
          </Box>
        )}
      </div>

      {result.caption && (
        <div role="tabpanel" hidden={tabValue !== 1}>
          {tabValue === 1 && (
            <Box sx={{ mb: 2 }}>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  maxHeight: '300px',
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}
              >
                {result.caption}
              </Paper>

              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="outlined"
                  startIcon={<ContentCopyIcon />}
                  onClick={() => handleCopy(result.caption, 'Caption')}
                >
                  Copy
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={() => handleDownload(result.caption, 'Caption')}
                >
                  Download
                </Button>
              </Box>
            </Box>
          )}
        </div>
      )}

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" color="text.secondary">
        Processed on: {new Date(result.timestamp).toLocaleString()}
      </Typography>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity="success" sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default TranscriptionResult;
