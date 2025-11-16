// src/services/transcript-extractor.ts
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { TranscriptResult } from '../types';

export class TranscriptExtractorService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.scrapecreators.com/v1';

  constructor() {
    this.apiKey = env.SCRAPECREATORS_API_KEY;
  }
  async extractTranscript(videoUrl: string): Promise<TranscriptResult> {
    try {
      logger.info(`Extracting transcript for: ${videoUrl}`);

      const response = await axios.post(
        `${this.baseUrl}/youtube/transcript`,
        {
          url: videoUrl,
          format: 'text'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      if (!response.data || !response.data.transcript) {
        throw new Error('No transcript returned from API');
      }

      const result: TranscriptResult = {
        transcript: response.data.transcript,
        confidence: response.data.confidence || 0.95,
        language: response.data.language || 'en'
      };

      logger.info(`Transcript extracted successfully. Length: ${result.transcript.length} chars`);
      
      return result;

    } catch (error: any) {
      logger.error('Transcript extraction failed:', error.message);
      
      if (error.response?.status === 404) {
        throw new Error('Video not found or has no transcript');
      } else if (error.response?.status === 401) {
        throw new Error('Invalid ScrapeCreators API key');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded');
      }
      
      throw new Error(`Transcript extraction failed: ${error.message}`);
    }
  }

  /**
   * Check if video has transcript available
   */
  async hasTranscript(videoUrl: string): Promise<boolean> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/youtube/check`,
        {
          params: { url: videoUrl },
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          },
          timeout: 10000
        }
      );

      return response.data?.hasTranscript || false;
    } catch (error) {
      logger.warn('Transcript check failed:', error);
      return false;
    }
  }
}