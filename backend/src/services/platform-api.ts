// src/services/platform-api.ts
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface YouTubeVideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl: string;
}

export class PlatformAPIService {
  private readonly youtubeApiKey: string;

  constructor() {
    this.youtubeApiKey = env.YOUTUBE_API_KEY;
  }

  /**
   * Get YouTube video statistics
   */
  async getYouTubeVideoStats(videoId: string): Promise<YouTubeVideoStats> {
    try {
      const response = await axios.get(
        'https://www.googleapis.com/youtube/v3/videos',
        {
          params: {
            part: 'statistics,snippet',
            id: videoId,
            key: this.youtubeApiKey
          }
        }
      );

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      const stats = video.statistics;
      const snippet = video.snippet;

      return {
        viewCount: parseInt(stats.viewCount || '0'),
        likeCount: parseInt(stats.likeCount || '0'),
        commentCount: parseInt(stats.commentCount || '0'),
        title: snippet.title,
        description: snippet.description,
        publishedAt: new Date(snippet.publishedAt),
        thumbnailUrl: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url
      };

    } catch (error: any) {
      logger.error(`Failed to get YouTube stats for ${videoId}:`, error.message);
      throw new Error(`YouTube API error: ${error.message}`);
    }
  }

  /**
   * Extract video ID from YouTube URL
   */
  extractYouTubeVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/v\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  /**
   * Validate YouTube video URL
   */
  isValidYouTubeUrl(url: string): boolean {
    return this.extractYouTubeVideoId(url) !== null;
  }
}