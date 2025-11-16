// src/services/platform-api.ts
import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../utils/logger';

interface VideoStats {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  title: string;
  description: string;
  publishedAt: Date;
  thumbnailUrl: string;
  platform: 'youtube' | 'tiktok' | 'twitter' | 'instagram';
}

export class PlatformAPIService {
  private readonly scrapeCreatorsApiKey: string;
  private readonly baseUrl = 'https://api.scrapecreators.com/v1';

  constructor() {
    this.scrapeCreatorsApiKey = env.SCRAPECREATORS_API_KEY;
  }

  /**
   * Get video statistics from any supported platform
   */
  async getVideoStats(videoId: string, platform: 'youtube' | 'tiktok' | 'twitter' | 'instagram'): Promise<VideoStats> {
    switch (platform) {
      case 'youtube':
        return this.getYouTubeVideoStats(videoId);
      case 'tiktok':
        return this.getTikTokVideoStats(videoId);
      case 'twitter':
        return this.getTwitterVideoStats(videoId);
      case 'instagram':
        return this.getInstagramVideoStats(videoId);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Get YouTube video statistics using ScrapCreators API
   */
  async getYouTubeVideoStats(videoId: string): Promise<VideoStats> {
    try {
      const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
      logger.info(`Fetching YouTube stats from ScrapCreators for: ${videoId}`);
      
      const response = await axios.get(
        `${this.baseUrl}/youtube/video`,
        {
          params: { url: videoUrl },
          headers: {
            'x-api-key': this.scrapeCreatorsApiKey
          },
          timeout: 30000
        }
      );

      if (!response.data || !response.data.success) {
        throw new Error('Video not found');
      }

      const data = response.data;

      return {
        viewCount: data.viewCountInt || parseInt(data.viewCountText?.replace(/,/g, '') || '0'),
        likeCount: data.likeCountInt || parseInt(data.likeCountText?.replace(/,/g, '') || '0'),
        commentCount: data.commentCountInt || parseInt(data.commentCountText?.replace(/,/g, '') || '0'),
        title: data.title || 'Untitled Video',
        description: data.description || '',
        publishedAt: data.publishDate ? new Date(data.publishDate) : new Date(),
        thumbnailUrl: data.thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        platform: 'youtube'
      };

    } catch (error: any) {
      logger.error(`Failed to get YouTube stats for ${videoId}:`, error.message);
      if (error.response) {
        logger.error('Error response:', JSON.stringify(error.response.data));
      }
      return this.handleAPIError(error, 'YouTube');
    }
  }

  /**
   * Get TikTok video statistics using ScrapCreators API
   */
  async getTikTokVideoStats(videoId: string): Promise<VideoStats> {
    try {
      // TikTok requires full URL
      const videoUrl = `https://www.tiktok.com/@user/video/${videoId}`;
      logger.info(`Fetching TikTok stats from ScrapCreators for: ${videoId}`);
      
      const response = await axios.get(
        `${this.baseUrl}/tiktok/video`,
        {
          params: { url: videoUrl },
          headers: {
            'x-api-key': this.scrapeCreatorsApiKey
          },
          timeout: 30000
        }
      );

      const data = response.data;

      return {
        viewCount: parseInt(data.playCount || data.views || '0'),
        likeCount: parseInt(data.diggCount || data.likes || '0'),
        commentCount: parseInt(data.commentCount || data.comments || '0'),
        title: data.desc || data.title || 'TikTok Video',
        description: data.desc || '',
        publishedAt: data.createTime ? new Date(data.createTime * 1000) : new Date(),
        thumbnailUrl: data.cover || data.dynamicCover || '',
        platform: 'tiktok'
      };

    } catch (error: any) {
      logger.error(`Failed to get TikTok stats for ${videoId}:`, error.message);
      return this.handleAPIError(error, 'TikTok');
    }
  }

  /**
   * Get Twitter video statistics using ScrapCreators API
   */
  async getTwitterVideoStats(tweetId: string): Promise<VideoStats> {
    try {
      const tweetUrl = `https://twitter.com/i/status/${tweetId}`;
      logger.info(`Fetching Twitter stats from ScrapCreators for: ${tweetId}`);
      
      const response = await axios.get(
        `${this.baseUrl}/twitter/tweet`,
        {
          params: { url: tweetUrl },
          headers: {
            'x-api-key': this.scrapeCreatorsApiKey
          },
          timeout: 30000
        }
      );

      const data = response.data;

      return {
        viewCount: parseInt(data.views || data.viewCount || '0'),
        likeCount: parseInt(data.likes || data.favoriteCount || '0'),
        commentCount: parseInt(data.replies || data.replyCount || '0'),
        title: data.text || 'Twitter Video',
        description: data.text || '',
        publishedAt: data.createdAt ? new Date(data.createdAt) : new Date(),
        thumbnailUrl: data.media?.[0]?.thumbnail || '',
        platform: 'twitter'
      };

    } catch (error: any) {
      logger.error(`Failed to get Twitter stats for ${tweetId}:`, error.message);
      return this.handleAPIError(error, 'Twitter');
    }
  }

  /**
   * Get Instagram video statistics using ScrapCreators API
   */
  async getInstagramVideoStats(postId: string): Promise<VideoStats> {
    try {
      const postUrl = `https://www.instagram.com/p/${postId}/`;
      logger.info(`Fetching Instagram stats from ScrapCreators for: ${postId}`);
      
      const response = await axios.get(
        `${this.baseUrl}/instagram/post`,
        {
          params: { url: postUrl },
          headers: {
            'x-api-key': this.scrapeCreatorsApiKey
          },
          timeout: 30000
        }
      );

      const data = response.data;

      return {
        viewCount: parseInt(data.videoViewCount || data.views || '0'),
        likeCount: parseInt(data.likeCount || data.likes || '0'),
        commentCount: parseInt(data.commentCount || data.comments || '0'),
        title: data.caption || 'Instagram Video',
        description: data.caption || '',
        publishedAt: data.takenAt ? new Date(data.takenAt * 1000) : new Date(),
        thumbnailUrl: data.thumbnailUrl || data.displayUrl || '',
        platform: 'instagram'
      };

    } catch (error: any) {
      logger.error(`Failed to get Instagram stats for ${postId}:`, error.message);
      return this.handleAPIError(error, 'Instagram');
    }
  }

  /**
   * Handle API errors consistently
   */
  private handleAPIError(error: any, platform: string): never {
    if (error.response?.status === 401) {
      throw new Error('Invalid ScrapCreators API key');
    } else if (error.response?.status === 404) {
      throw new Error(`${platform} video not found`);
    } else if (error.response?.status === 429) {
      throw new Error('Rate limit exceeded');
    }
    
    throw new Error(`ScrapCreators API error for ${platform}: ${error.message}`);
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
   * Extract video ID from TikTok URL
   */
  extractTikTokVideoId(url: string): string | null {
    const match = url.match(/tiktok\.com\/@[\w.-]+\/video\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract tweet ID from Twitter URL
   */
  extractTwitterTweetId(url: string): string | null {
    const match = url.match(/twitter\.com\/\w+\/status\/(\d+)/);
    return match ? match[1] : null;
  }

  /**
   * Extract post ID from Instagram URL
   */
  extractInstagramPostId(url: string): string | null {
    const match = url.match(/instagram\.com\/(?:p|reel)\/([A-Za-z0-9_-]+)/);
    return match ? match[1] : null;
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url: string): 'youtube' | 'tiktok' | 'twitter' | 'instagram' | null {
    if (!url) return null;
    
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return 'youtube';
    } else if (url.includes('tiktok.com')) {
      return 'tiktok';
    } else if (url.includes('twitter.com') || url.includes('x.com')) {
      return 'twitter';
    } else if (url.includes('instagram.com')) {
      return 'instagram';
    }
    return null;
  }

  /**
   * Validate video URL for any platform
   */
  isValidVideoUrl(url: string): boolean {
    const platform = this.detectPlatform(url);
    if (!platform) return false;

    switch (platform) {
      case 'youtube':
        return this.extractYouTubeVideoId(url) !== null;
      case 'tiktok':
        return this.extractTikTokVideoId(url) !== null;
      case 'twitter':
        return this.extractTwitterTweetId(url) !== null;
      case 'instagram':
        return this.extractInstagramPostId(url) !== null;
      default:
        return false;
    }
  }

  /**
   * Validate YouTube URL (backward compatibility)
   */
  isValidYouTubeUrl(url: string): boolean {
    return this.extractYouTubeVideoId(url) !== null;
  }
}