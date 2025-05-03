import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

/**
 * About page component with information about the application
 */
function About() {
  return (
    <Box>
      <Box sx={{ mb: 4, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom>
          About Reels2Transcript
        </Typography>
        <Typography variant="subtitle1" color="text.secondary">
          Extract, analyze, and repurpose Instagram Reels content
        </Typography>
      </Box>
      
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          What is Reels2Transcript?
        </Typography>
        
        <Typography variant="body1" paragraph>
          Reels2Transcript is a web application designed to help content creators, marketers, and researchers extract valuable text content from Instagram Reels. Our tool automatically transcribes speech from Reels videos and extracts captions, making it easy to repurpose content, analyze trends, or create subtitles.
        </Typography>
        
        <Typography variant="body1" paragraph>
          Whether you're looking to turn your Reels content into blog posts, analyze engagement patterns, or make your content more accessible, Reels2Transcript provides the tools you need to work efficiently with Instagram Reels content.
        </Typography>
      </Paper>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Features
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Speech Transcription" 
                    secondary="Convert spoken words in Reels to accurate text transcriptions" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Caption Extraction" 
                    secondary="Capture the original captions, hashtags, and mentions" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Bulk Processing" 
                    secondary="Process up to 50 Reels URLs simultaneously" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Multiple Output Formats" 
                    secondary="Download results as plain text, JSON, CSV, or SRT" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Customizable Transcription" 
                    secondary="Choose between verbatim, clean, or condensed transcription styles" 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Use Cases
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Content Repurposing" 
                    secondary="Turn Reels content into blog posts, newsletters, or social media captions" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Content Analysis" 
                    secondary="Analyze trends, topics, and language patterns in Reels content" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Accessibility" 
                    secondary="Create subtitles to make your content more accessible" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Research" 
                    secondary="Collect and analyze social media content for research purposes" 
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CheckCircleOutlineIcon color="secondary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Marketing" 
                    secondary="Extract insights from competitor content or your own campaigns" 
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      
      <Divider sx={{ mb: 4 }} />
      
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          How It Works
        </Typography>
        
        <Typography variant="body1" paragraph>
          Reels2Transcript uses advanced speech recognition technology to transcribe the audio from Instagram Reels. The process involves:
        </Typography>
        
        <Typography variant="body2" component="div" sx={{ mb: 2 }}>
          <ol>
            <li><strong>URL Processing:</strong> We extract the video and audio data from the provided Instagram Reel URL</li>
            <li><strong>Audio Transcription:</strong> Our system processes the audio to generate an accurate text transcription</li>
            <li><strong>Caption Extraction:</strong> We capture the original caption text from the Reel</li>
            <li><strong>Formatting:</strong> The results are formatted according to your preferences</li>
            <li><strong>Delivery:</strong> You can download the results in your preferred format</li>
          </ol>
        </Typography>
      </Box>
      
      <Paper elevation={2} sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" gutterBottom>
          Get Started Today
        </Typography>
        
        <Typography variant="body1">
          Try Reels2Transcript now and start extracting valuable content from your Instagram Reels!
        </Typography>
      </Paper>
    </Box>
  );
}

export default About;
