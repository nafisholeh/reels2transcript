import { useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import DownloadIcon from '@mui/icons-material/Download';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Types
interface BulkTranscriptionResultsProps {
  results: Array<{
    url: string;
    transcription: string;
    caption?: string;
    timestamp: string;
    formattedOutput?: {
      text: string;
      format: string;
    };
    error?: string;
  }>;
  format: string;
}

/**
 * Component to display bulk transcription results with download options
 */
function BulkTranscriptionResults({ results, format }: BulkTranscriptionResultsProps) {
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // Download all results as a single file
  const handleDownloadAll = () => {
    let content = '';
    let filename = '';
    let mimeType = '';

    // Check if all results have formatted output
    const allHaveFormattedOutput = results.every(result => result.formattedOutput);

    if (allHaveFormattedOutput && results.length > 0) {
      // Use the format of the first result
      const firstResultFormat = results[0].formattedOutput?.format || format;

      switch (firstResultFormat) {
        case 'json':
          // Create a JSON array of all formatted outputs
          content = JSON.stringify(
            results.map(result => JSON.parse(result.formattedOutput?.text || '{}')),
            null,
            2
          );
          filename = `bulk_transcriptions_${new Date().getTime()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          // Combine all CSV outputs (skip headers except for the first one)
          content = '';
          results.forEach((result, index) => {
            if (result.formattedOutput) {
              const lines = result.formattedOutput.text.split('\n');
              if (index === 0) {
                // Include header from first result
                content += lines.join('\n') + '\n';
              } else {
                // Skip header for subsequent results
                content += lines.slice(1).join('\n') + '\n';
              }
            }
          });
          filename = `bulk_transcriptions_${new Date().getTime()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'srt':
          // Combine all SRT outputs with adjusted timestamps
          content = '';
          let entryCount = 1;
          let timeOffset = 0;

          results.forEach((result, index) => {
            if (result.formattedOutput) {
              const srtContent = result.formattedOutput.text;
              const entries = srtContent.split('\n\n').filter(entry => entry.trim() !== '');

              entries.forEach(entry => {
                const lines = entry.split('\n');
                if (lines.length >= 3) {
                  // Replace entry number
                  content += `${entryCount}\n`;

                  // Add time offset to timestamps
                  const timestamps = lines[1].split(' --> ');
                  if (timestamps.length === 2) {
                    const startTime = adjustTimestamp(timestamps[0], timeOffset);
                    const endTime = adjustTimestamp(timestamps[1], timeOffset);
                    content += `${startTime} --> ${endTime}\n`;
                  } else {
                    content += lines[1] + '\n';
                  }

                  // Add subtitle text
                  for (let i = 2; i < lines.length; i++) {
                    content += lines[i] + '\n';
                  }

                  content += '\n';
                  entryCount++;
                }
              });

              // Increase time offset for next result (5 seconds per entry)
              timeOffset += entries.length * 5;
            }
          });
          filename = `bulk_transcriptions_${new Date().getTime()}.srt`;
          mimeType = 'application/x-subrip';
          break;
        default:
          // Plain text format
          results.forEach((result, index) => {
            if (result.formattedOutput) {
              content += `--- Result ${index + 1} ---\n`;
              content += result.formattedOutput.text + '\n\n';
            }
          });
          filename = `bulk_transcriptions_${new Date().getTime()}.txt`;
          mimeType = 'text/plain';
      }
    } else {
      // Format content based on selected format
      switch (format) {
        case 'json':
          content = JSON.stringify(results, null, 2);
          filename = `bulk_transcriptions_${new Date().getTime()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          // Create CSV header
          content = 'URL,Transcription,Caption,Timestamp\n';
          // Add each result as a row
          results.forEach(result => {
            if (!result.error) {
              content += `"${result.url}","${result.transcription.replace(/"/g, '""')}","${
                result.caption ? result.caption.replace(/"/g, '""') : ''
              }","${result.timestamp}"\n`;
            } else {
              content += `"${result.url}","Error: ${result.error.replace(/"/g, '""')}","","${result.timestamp}"\n`;
            }
          });
          filename = `bulk_transcriptions_${new Date().getTime()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'srt':
          // Create a simple SRT file with all transcriptions
          content = '';
          let counter = 1;
          let timeOffset = 0;

          results.forEach((result, index) => {
            if (!result.error) {
              // Split transcription into sentences
              const sentences = result.transcription.split(/[.!?]/).filter(s => s.trim() !== '');

              sentences.forEach((sentence, sentenceIndex) => {
                const startTime = formatSrtTime(timeOffset + sentenceIndex * 5);
                const endTime = formatSrtTime(timeOffset + (sentenceIndex + 1) * 5);

                content += `${counter}\n`;
                content += `${startTime} --> ${endTime}\n`;
                content += `${sentence.trim()}.\n\n`;

                counter++;
              });

              // Add 5 seconds between results
              timeOffset += sentences.length * 5 + 5;
            }
          });
          filename = `bulk_transcriptions_${new Date().getTime()}.srt`;
          mimeType = 'application/x-subrip';
          break;
        default:
          // Plain text format
          results.forEach((result, index) => {
            content += `--- Result ${index + 1} ---\n`;
            content += `URL: ${result.url}\n`;
            if (!result.error) {
              content += `Transcription: ${result.transcription}\n`;
              if (result.caption) {
                content += `Caption: ${result.caption}\n`;
              }
            } else {
              content += `Error: ${result.error}\n`;
            }
            content += `Timestamp: ${result.timestamp}\n\n`;
          });
          filename = `bulk_transcriptions_${new Date().getTime()}.txt`;
          mimeType = 'text/plain';
      }
    }

    // Create and trigger download
    const element = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setSnackbarMessage(`All results downloaded as ${filename}`);
    setSnackbarOpen(true);
  };

  // Helper function to adjust SRT timestamp with an offset
  const adjustTimestamp = (timestamp: string, offsetSeconds: number): string => {
    const parts = timestamp.split(',');
    if (parts.length !== 2) return timestamp;

    const timeParts = parts[0].split(':');
    if (timeParts.length !== 3) return timestamp;

    let hours = parseInt(timeParts[0]);
    let minutes = parseInt(timeParts[1]);
    let seconds = parseInt(timeParts[2]);

    seconds += offsetSeconds;
    minutes += Math.floor(seconds / 60);
    seconds %= 60;
    hours += Math.floor(minutes / 60);
    minutes %= 60;

    return `${String(hours).padStart(2, '0')}:${
      String(minutes).padStart(2, '0')}:${
      String(seconds).padStart(2, '0')},${parts[1]}`;
  };

  // Helper function to format time for SRT
  const formatSrtTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    return `${String(hours).padStart(2, '0')}:${
      String(minutes).padStart(2, '0')}:${
      String(secs).padStart(2, '0')},000`;
  };

  // Download a single result
  const handleDownloadSingle = (result: any, index: number) => {
    let content = '';
    let filename = '';
    let mimeType = '';

    // Use formatted output if available
    if (result.formattedOutput) {
      content = result.formattedOutput.text;

      // Set filename and mime type based on format
      switch (result.formattedOutput.format) {
        case 'json':
          filename = `transcription_${index + 1}_${new Date().getTime()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          filename = `transcription_${index + 1}_${new Date().getTime()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'srt':
          filename = `transcription_${index + 1}_${new Date().getTime()}.srt`;
          mimeType = 'application/x-subrip';
          break;
        default:
          filename = `transcription_${index + 1}_${new Date().getTime()}.txt`;
          mimeType = 'text/plain';
      }
    } else {
      // Format content based on selected format
      switch (format) {
        case 'json':
          content = JSON.stringify(result, null, 2);
          filename = `transcription_${index + 1}_${new Date().getTime()}.json`;
          mimeType = 'application/json';
          break;
        case 'csv':
          content = 'URL,Transcription,Caption,Timestamp\n';
          content += `"${result.url}","${result.transcription.replace(/"/g, '""')}","${
            result.caption ? result.caption.replace(/"/g, '""') : ''
          }","${result.timestamp}"\n`;
          filename = `transcription_${index + 1}_${new Date().getTime()}.csv`;
          mimeType = 'text/csv';
          break;
        case 'srt':
          // Create a simple SRT file
          content = '1\n00:00:00,000 --> 00:00:05,000\n' + result.transcription + '\n';
          filename = `transcription_${index + 1}_${new Date().getTime()}.srt`;
          mimeType = 'application/x-subrip';
          break;
        default:
          content = `URL: ${result.url}\n`;
          content += `Transcription: ${result.transcription}\n`;
          if (result.caption) {
            content += `Caption: ${result.caption}\n`;
          }
          content += `Timestamp: ${result.timestamp}\n`;
          filename = `transcription_${index + 1}_${new Date().getTime()}.txt`;
          mimeType = 'text/plain';
      }
    }

    // Create and trigger download
    const element = document.createElement('a');
    const blob = new Blob([content], { type: mimeType });
    element.href = URL.createObjectURL(blob);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setSnackbarMessage(`Result ${index + 1} downloaded as ${filename}`);
    setSnackbarOpen(true);
  };

  // Close snackbar
  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Bulk Extraction Results ({results.length})
        </Typography>

        <Button
          variant="contained"
          startIcon={<DownloadIcon />}
          onClick={handleDownloadAll}
        >
          Download All
        </Button>
      </Box>

      <Divider sx={{ mb: 3 }} />

      <TableContainer component={Paper} variant="outlined">
        <Table sx={{ minWidth: 650 }} aria-label="transcription results table">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>URL</TableCell>
              <TableCell>Details</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {results.map((result, index) => (
              <TableRow
                key={index}
                sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
              >
                <TableCell component="th" scope="row">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    sx={{
                      maxWidth: '250px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {result.url}
                  </Typography>
                </TableCell>
                <TableCell>
                  {result.error ? (
                    <Typography color="error">
                      Error: {result.error}
                    </Typography>
                  ) : (
                    <Accordion>
                      <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls={`panel-content-${index}`}
                        id={`panel-header-${index}`}
                      >
                        <Typography>View Content</Typography>
                      </AccordionSummary>
                      <AccordionDetails>
                        <Typography variant="subtitle2">Transcription:</Typography>
                        <Typography
                          variant="body2"
                          sx={{
                            whiteSpace: 'pre-wrap',
                            mb: 2,
                            fontFamily: 'monospace',
                            fontSize: '0.8rem'
                          }}
                        >
                          {result.transcription.length > 300
                            ? `${result.transcription.substring(0, 300)}...`
                            : result.transcription}
                        </Typography>

                        {result.caption && (
                          <>
                            <Typography variant="subtitle2">Caption:</Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: 'pre-wrap',
                                fontFamily: 'monospace',
                                fontSize: '0.8rem'
                              }}
                            >
                              {result.caption.length > 300
                                ? `${result.caption.substring(0, 300)}...`
                                : result.caption}
                            </Typography>
                          </>
                        )}
                      </AccordionDetails>
                    </Accordion>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadSingle(result, index)}
                  >
                    Download
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

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

export default BulkTranscriptionResults;
