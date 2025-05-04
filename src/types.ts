/**
 * Type definitions for the application
 */

/**
 * Transcription result type
 */
export interface TranscriptionResult {
  url: string;
  transcription: string;
  caption: string;
  timestamp: string;
  formattedOutput?: {
    text: string;
    format: string;
  };
}

/**
 * API response type
 */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}
