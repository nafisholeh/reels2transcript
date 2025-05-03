import axios from 'axios';
import { ExtractOptions } from '../components/UrlInput';

// API base URL from environment variables
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Extract transcription from a single Instagram Reel URL
 * @param url - Instagram Reel URL
 * @param options - Extraction options
 * @returns Promise with extraction result
 */
export const extractSingleTranscription = async (url: string, options: ExtractOptions) => {
  try {
    const response = await apiClient.post('/extract/single', { url, options });
    return response.data;
  } catch (error) {
    console.error('Error extracting transcription:', error);
    throw error;
  }
};

/**
 * Extract transcriptions from multiple Instagram Reel URLs
 * @param urls - Array of Instagram Reel URLs
 * @param options - Extraction options
 * @returns Promise with extraction results
 */
export const extractBulkTranscriptions = async (urls: string[], options: ExtractOptions) => {
  try {
    const response = await apiClient.post('/extract/bulk', { urls, options });
    return response.data;
  } catch (error) {
    console.error('Error extracting bulk transcriptions:', error);
    throw error;
  }
};

/**
 * Check server health
 * @returns Promise with server health status
 */
export const checkServerHealth = async () => {
  try {
    const response = await apiClient.get('/health');
    return response.data;
  } catch (error) {
    console.error('Error checking server health:', error);
    throw error;
  }
};

export default {
  extractSingleTranscription,
  extractBulkTranscriptions,
  checkServerHealth,
};
