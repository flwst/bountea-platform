// src/services/ai-content-analyzer.ts
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { AIAnalysisResult } from '../types';

export class AIContentAnalyzer {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    this.client = new Anthropic({
      apiKey: env.AI_ANALYSIS_API_KEY,
    });
    this.model = env.AI_ANALYSIS_MODEL;
  }

  /**
   * Analyze video content using Claude 3.5 Sonnet
   * Cost: ~$0.006 per analysis
   */
  async analyzeContent(
    transcript: string,
    bountyRequirements: string,
    videoMetadata: {
      title: string;
      description: string;
      views: number;
      publishedAt: Date;
    }
  ): Promise<AIAnalysisResult> {
    try {
      logger.info('Starting AI content analysis');

      const prompt = this.buildAnalysisPrompt(transcript, bountyRequirements, videoMetadata);

      const response = await (this.client as any).messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      });

      const analysisText = response.content[0].type === 'text' 
        ? response.content[0].text 
        : '';

      const result = this.parseAnalysisResponse(analysisText);

      logger.info(`AI analysis completed. Rating: ${result.rating}/10`);

      return result;

    } catch (error: any) {
      logger.error('AI analysis failed:', error.message);
      throw new Error(`AI analysis failed: ${error.message}`);
    }
  }

  private buildAnalysisPrompt(
    transcript: string,
    requirements: string,
    metadata: {
      title: string;
      description: string;
      views: number;
      publishedAt: Date;
    }
  ): string {
    return `You are an expert content analyzer for a video bounty platform. Analyze if this video meets the bounty requirements.

BOUNTY REQUIREMENTS:
${requirements}

VIDEO METADATA:
- Title: ${metadata.title}
- Description: ${metadata.description}
- Views: ${metadata.views}
- Published: ${metadata.publishedAt.toISOString()}

VIDEO TRANSCRIPT:
${transcript.slice(0, 8000)}

ANALYZE AND RESPOND IN JSON FORMAT:
{
  "contentMatches": boolean,
  "matchConfidence": number (0-1),
  "topics": string[],
  "isBot": boolean,
  "botConfidence": number (0-1),
  "botSignals": string[],
  "rating": number (1-10),
  "ratingReasoning": "brief explanation",
  "overallConfidence": number (0-1)
}

RATING SCALE (1-10):
10: Perfect match, high quality, authentic
9: Excellent match, very good quality
8: Great match, good quality
7: Good match, acceptable quality (AUTO-APPROVE THRESHOLD)
6: Decent match but needs review
5: Moderate match, some concerns
4: Weak match or quality issues
3: Poor match
2: Very poor match
1: Does not meet requirements

BOT DETECTION CRITERIA:
- Repetitive or unnatural speech patterns
- Text-to-speech indicators
- Generic/template-like content
- Promotional spam patterns
- Low engagement relative to views

Be strict but fair. Consider authenticity, content quality, and genuine creator effort.`;
  }

  private parseAnalysisResponse(responseText: string): AIAnalysisResult {
    try {
      // Extract JSON from response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Validate and normalize
      return {
        contentMatches: Boolean(parsed.contentMatches),
        matchConfidence: Math.min(1, Math.max(0, Number(parsed.matchConfidence) || 0)),
        topics: Array.isArray(parsed.topics) ? parsed.topics : [],
        isBot: Boolean(parsed.isBot),
        botConfidence: Math.min(1, Math.max(0, Number(parsed.botConfidence) || 0)),
        botSignals: Array.isArray(parsed.botSignals) ? parsed.botSignals : [],
        rating: Math.min(10, Math.max(1, Math.round(Number(parsed.rating) || 5))),
        ratingReasoning: String(parsed.ratingReasoning || 'Analysis completed'),
        overallConfidence: Math.min(1, Math.max(0, Number(parsed.overallConfidence) || 0.5))
      };
    } catch (error) {
      logger.error('Failed to parse AI response:', error);
      
      // Return safe fallback for manual review
      return {
        contentMatches: false,
        matchConfidence: 0,
        topics: [],
        isBot: false,
        botConfidence: 0,
        botSignals: [],
        rating: 5,
        ratingReasoning: 'Analysis parsing failed - requires manual review',
        overallConfidence: 0
      };
    }
  }
}