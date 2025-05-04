/**
 * Format transcription output based on requested format
 * @param {Object} data - Transcription data
 * @param {string} format - Output format (plain, json, csv, srt)
 * @returns {Object} - Formatted output
 */
export const formatOutput = (data, format = 'plain') => {
  try {
    // CRITICAL FIX: Ensure transcription text is available
    if (!data.transcription.text || data.transcription.text.trim() === '') {
      console.warn('formatOutput: Transcription text is empty but segments exist. Constructing text from segments.');

      // If we have segments, construct text from them
      if (data.transcription.segments && data.transcription.segments.length > 0) {
        // Sort segments by start time
        const sortedSegments = [...data.transcription.segments].sort((a, b) => a.start - b.start);
        // Join words from segments
        data.transcription.text = sortedSegments.map(segment => segment.word).join(' ');
        console.log(`formatOutput: Constructed text from ${sortedSegments.length} segments: "${data.transcription.text}"`);
      } else {
        data.transcription.text = 'No transcription available';
      }
    }

    switch (format) {
      case 'json':
        return formatAsJson(data);
      case 'csv':
        return formatAsCsv(data);
      case 'srt':
        return formatAsSrt(data);
      case 'plain':
      default:
        return formatAsPlainText(data);
    }
  } catch (error) {
    console.error('Error formatting output:', error);
    return {
      text: data.transcription && data.transcription.text ? data.transcription.text : 'Error formatting output',
      format: 'plain'
    };
  }
};

/**
 * Format data as plain text
 * @param {Object} data - Transcription data
 * @returns {Object} - Formatted output
 */
const formatAsPlainText = (data) => {
  let output = '';

  // Add URL
  output += `URL: ${data.url}\n\n`;

  // Add transcription
  output += `TRANSCRIPTION:\n${data.transcription.text}\n\n`;

  // Add caption if available
  if (data.caption) {
    output += `CAPTION:\n${data.caption}\n\n`;
  }

  // Add metadata
  output += `Processed on: ${new Date(data.timestamp).toLocaleString()}\n`;
  output += `Language: ${data.transcription.language}\n`;
  output += `Style: ${data.transcription.style}\n`;

  return {
    text: output,
    format: 'plain'
  };
};

/**
 * Format data as JSON
 * @param {Object} data - Transcription data
 * @returns {Object} - Formatted output
 */
const formatAsJson = (data) => {
  const jsonOutput = {
    url: data.url,
    transcription: data.transcription.text,
    caption: data.caption || '',
    metadata: {
      timestamp: data.timestamp,
      language: data.transcription.language,
      style: data.transcription.style,
      timestamps: data.transcription.timestamps
    }
  };

  return {
    text: JSON.stringify(jsonOutput, null, 2),
    format: 'json'
  };
};

/**
 * Format data as CSV
 * @param {Object} data - Transcription data
 * @returns {Object} - Formatted output
 */
const formatAsCsv = (data) => {
  // Create CSV header
  let output = 'URL,Transcription,Caption,Timestamp,Language,Style\n';

  // Add data row
  output += `"${data.url}","${data.transcription.text.replace(/"/g, '""')}","${
    data.caption ? data.caption.replace(/"/g, '""') : ''
  }","${data.timestamp}","${data.transcription.language}","${data.transcription.style}"\n`;

  return {
    text: output,
    format: 'csv'
  };
};

/**
 * Format data as SRT (SubRip Subtitle)
 * @param {Object} data - Transcription data
 * @returns {Object} - Formatted output
 */
const formatAsSrt = (data) => {
  // If transcription doesn't have timestamps, create a simple SRT
  if (!data.transcription.timestamps) {
    return {
      text: createSimpleSrt(data.transcription.text),
      format: 'srt'
    };
  }

  // Parse timestamps from transcription text
  const lines = data.transcription.text.split('\n');
  let srtOutput = '';
  let counter = 1;

  lines.forEach((line, index) => {
    if (line.trim() === '') return;

    // Extract timestamp if available
    const timestampMatch = line.match(/\\[(\\d{2}):(\\d{2}):(\\d{2})\\]/);
    let startTime = '00:00:00,000';
    let endTime = '00:00:05,000';
    let text = line;

    if (timestampMatch) {
      startTime = `${timestampMatch[1]}:${timestampMatch[2]}:${timestampMatch[3]},000`;

      // Calculate end time (5 seconds later)
      const endSeconds = parseInt(timestampMatch[3]) + 5;
      const endMinutes = parseInt(timestampMatch[2]) + Math.floor(endSeconds / 60);
      const endHours = parseInt(timestampMatch[1]) + Math.floor(endMinutes / 60);

      endTime = `${String(endHours % 24).padStart(2, '0')}:${
        String(endMinutes % 60).padStart(2, '0')}:${
        String(endSeconds % 60).padStart(2, '0')},000`;

      // Remove timestamp from text
      text = line.replace(/\\[\\d{2}:\\d{2}:\\d{2}\\] /, '');
    } else {
      // If no timestamp, calculate based on index
      const seconds = index * 5;
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);

      startTime = `${String(hours).padStart(2, '0')}:${
        String(minutes % 60).padStart(2, '0')}:${
        String(seconds % 60).padStart(2, '0')},000`;

      const endSeconds = seconds + 5;
      const endMinutes = Math.floor(endSeconds / 60);
      const endHours = Math.floor(endMinutes / 60);

      endTime = `${String(endHours).padStart(2, '0')}:${
        String(endMinutes % 60).padStart(2, '0')}:${
        String(endSeconds % 60).padStart(2, '0')},000`;
    }

    // Add SRT entry
    srtOutput += `${counter}\n`;
    srtOutput += `${startTime} --> ${endTime}\n`;
    srtOutput += `${text}\n\n`;

    counter++;
  });

  return {
    text: srtOutput,
    format: 'srt'
  };
};

/**
 * Create a simple SRT file from text
 * @param {string} text - Transcription text
 * @returns {string} - SRT formatted text
 */
const createSimpleSrt = (text) => {
  // Split text into sentences
  const sentences = text.replace(/([.!?])\\s+/g, '$1|').split('|');
  let srtOutput = '';
  let counter = 1;

  sentences.forEach((sentence, index) => {
    if (sentence.trim() === '') return;

    // Calculate timestamps
    const seconds = index * 5;
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    const startTime = `${String(hours).padStart(2, '0')}:${
      String(minutes % 60).padStart(2, '0')}:${
      String(seconds % 60).padStart(2, '0')},000`;

    const endSeconds = seconds + 5;
    const endMinutes = Math.floor(endSeconds / 60);
    const endHours = Math.floor(endMinutes / 60);

    const endTime = `${String(endHours).padStart(2, '0')}:${
      String(endMinutes % 60).padStart(2, '0')}:${
      String(endSeconds % 60).padStart(2, '0')},000`;

    // Add SRT entry
    srtOutput += `${counter}\n`;
    srtOutput += `${startTime} --> ${endTime}\n`;
    srtOutput += `${sentence.trim()}\n\n`;

    counter++;
  });

  return srtOutput;
};
