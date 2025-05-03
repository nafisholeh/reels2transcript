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
          content += `"${result.url}","${result.transcription.replace(/"/g, '""')}","${
            result.caption ? result.caption.replace(/"/g, '""') : ''
          }","${result.timestamp}"\n`;
        });
        filename = `bulk_transcriptions_${new Date().getTime()}.csv`;
        mimeType = 'text/csv';
        break;
      default:
        // Plain text format
        results.forEach((result, index) => {
          content += `--- Result ${index + 1} ---\n`;
          content += `URL: ${result.url}\n`;
          content += `Transcription: ${result.transcription}\n`;
          if (result.caption) {
            content += `Caption: ${result.caption}\n`;
          }
          content += `Timestamp: ${result.timestamp}\n\n`;
        });
        filename = `bulk_transcriptions_${new Date().getTime()}.txt`;
        mimeType = 'text/plain';
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

  // Download a single result
  const handleDownloadSingle = (result: any, index: number) => {
    let content = '';
    let filename = '';
    let mimeType = '';
    
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
