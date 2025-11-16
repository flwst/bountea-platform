// src/services/approval-queue.ts
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { TranscriptExtractorService } from './transcript-extractor';
import { AIContentAnalyzer } from './ai-content-analyzer';

export class ApprovalQueueService {
  private transcriptService: TranscriptExtractorService;
  private aiAnalyzer: AIContentAnalyzer;

  constructor() {
    this.transcriptService = new TranscriptExtractorService();
    this.aiAnalyzer = new AIContentAnalyzer();
  }

  /**
   * Process video for milestone approval
   * Auto-approves if rating >= 7, otherwise queues for manual review
   */
  async processVideoForMilestone(videoId: number, milestoneId: number): Promise<void> {
    try {
      logger.info(`Processing video ${videoId} for milestone ${milestoneId}`);

      // Get video with bounty details
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        include: {
          bounty: {
            include: {
              milestones: true
            }
          }
        }
      });

      if (!video) {
        throw new Error('Video not found');
      }

      const milestone = video.bounty.milestones.find(m => m.id === milestoneId);
      if (!milestone) {
        throw new Error('Milestone not found');
      }

      // Check if already analyzed
      const existingAnalysis = await prisma.videoAnalysis.findUnique({
        where: {
          videoId_milestoneId: {
            videoId,
            milestoneId
          }
        }
      });

      if (existingAnalysis) {
        logger.info('Analysis already exists, skipping');
        return;
      }

      // Extract transcript
      logger.info('Extracting transcript...');
      const transcriptResult = await this.transcriptService.extractTranscript(video.videoUrl);

      // Analyze content with AI
      logger.info('Analyzing content with AI...');
      const aiResult = await this.aiAnalyzer.analyzeContent(
        transcriptResult.transcript,
        video.bounty.requirements || '',
        {
          title: video.title || '',
          description: video.description || '',
          views: Number(video.currentViews),
          publishedAt: video.publishedAt || new Date()
        }
      );

      // Save analysis
      const analysis = await prisma.videoAnalysis.create({
        data: {
          videoId,
          milestoneId,
          transcription: transcriptResult.transcript,
          transcriptionConfidence: transcriptResult.confidence,
          languageDetected: transcriptResult.language,
          contentMatches: aiResult.contentMatches,
          matchConfidence: aiResult.matchConfidence,
          topicsDetected: aiResult.topics,
          isBot: aiResult.isBot,
          botConfidence: aiResult.botConfidence,
          botSignals: aiResult.botSignals,
          rating: aiResult.rating,
          ratingReasoning: aiResult.ratingReasoning,
          overallConfidence: aiResult.overallConfidence,
          aiModelUsed: 'claude-3-5-sonnet-20241022',
          status: 'completed',
          apiCostUsd: 0.008 // $0.002 transcript + $0.006 AI
        }
      });

      // AUTO-APPROVE if rating >= 7
      if (aiResult.rating >= 7) {
        await this.autoApprove(videoId, milestoneId, analysis.id);
      } else {
        // Queue for manual review
        await this.queueForReview(videoId, milestoneId, analysis.id, aiResult.rating);
      }

    } catch (error: any) {
      logger.error(`Failed to process video ${videoId}:`, error.message);
      
      // Queue for manual review on error
      await this.queueForReview(videoId, milestoneId, null, 0);
      
      throw error;
    }
  }

  /**
   * Auto-approve video (rating >= 7)
   */
  private async autoApprove(videoId: number, milestoneId: number, analysisId: number): Promise<void> {
    logger.info(`Auto-approving video ${videoId} for milestone ${milestoneId}`);

    await prisma.$transaction([
      // Create approval queue entry
      prisma.approvalQueue.create({
        data: {
          videoId,
          milestoneId,
          analysisId,
          status: 'approved',
          decisionType: 'auto',
          decidedBy: 'system',
          decisionReason: 'Auto-approved: AI rating >= 7',
          decidedAt: new Date()
        }
      }),
      // Update video status
      prisma.video.update({
        where: { id: videoId },
        data: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: 'system'
        }
      })
    ]);

    logger.info(`Video ${videoId} auto-approved successfully`);
  }

  /**
   * Queue for manual review (rating < 7 or error)
   */
  private async queueForReview(
    videoId: number,
    milestoneId: number,
    analysisId: number | null,
    rating: number
  ): Promise<void> {
    logger.info(`Queuing video ${videoId} for manual review (rating: ${rating})`);

    // Calculate priority (lower rating = higher priority for review)
    const priority = rating > 0 ? 10 - rating : 10;

    await prisma.approvalQueue.create({
      data: {
        videoId,
        milestoneId,
        analysisId,
        status: 'pending',
        priority
      }
    });

    logger.info(`Video ${videoId} queued for manual review`);
  }

  /**
   * Manual approve by admin
   */
  async manualApprove(
    queueId: number,
    adminId: string,
    reason?: string
  ): Promise<void> {
    const queueItem = await prisma.approvalQueue.findUnique({
      where: { id: queueId }
    });

    if (!queueItem) {
      throw new Error('Queue item not found');
    }

    await prisma.$transaction([
      prisma.approvalQueue.update({
        where: { id: queueId },
        data: {
          status: 'approved',
          decisionType: 'manual',
          decidedBy: adminId,
          decisionReason: reason || 'Manually approved by admin',
          decidedAt: new Date()
        }
      }),
      prisma.video.update({
        where: { id: queueItem.videoId },
        data: {
          approvalStatus: 'approved',
          approvedAt: new Date(),
          approvedBy: adminId
        }
      }),
      prisma.adminAction.create({
        data: {
          adminId,
          actionType: 'approve',
          entityType: 'video',
          entityId: queueItem.videoId,
          reason
        }
      })
    ]);

    logger.info(`Video ${queueItem.videoId} manually approved by ${adminId}`);
  }

  /**
   * Manual reject by admin
   */
  async manualReject(
    queueId: number,
    adminId: string,
    reason: string
  ): Promise<void> {
    const queueItem = await prisma.approvalQueue.findUnique({
      where: { id: queueId }
    });

    if (!queueItem) {
      throw new Error('Queue item not found');
    }

    await prisma.$transaction([
      prisma.approvalQueue.update({
        where: { id: queueId },
        data: {
          status: 'rejected',
          decisionType: 'manual',
          decidedBy: adminId,
          decisionReason: reason,
          decidedAt: new Date()
        }
      }),
      prisma.video.update({
        where: { id: queueItem.videoId },
        data: {
          approvalStatus: 'rejected',
          rejectionReason: reason
        }
      }),
      prisma.adminAction.create({
        data: {
          adminId,
          actionType: 'reject',
          entityType: 'video',
          entityId: queueItem.videoId,
          reason
        }
      })
    ]);

    logger.info(`Video ${queueItem.videoId} rejected by ${adminId}`);
  }

  /**
   * Get pending queue items for admin review
   */
  async getPendingQueue(limit: number = 50) {
    return prisma.approvalQueue.findMany({
      where: {
        status: 'pending'
      },
      include: {
        video: {
          include: {
            bounty: true,
            creator: true
          }
        },
        milestone: true,
        analysis: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ],
      take: limit
    });
  }
}