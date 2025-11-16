// src/routes/admin.ts
import { Router } from 'express';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { ApprovalQueueService } from '../services/approval-queue';

const router = Router();
const approvalService = new ApprovalQueueService();

// Get approval queue
router.get('/approval-queue', authenticate, requireRole('admin'), async (req: AuthRequest, res, next) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const queue = await approvalService.getPendingQueue(limit);
    
    res.json({ queue });
  } catch (error) {
    next(error);
  }
});

// Approve video
router.post('/approval-queue/:id/approve', authenticate, requireRole('admin'), async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;
    await approvalService.manualApprove(Number(req.params.id), req.user!.id, reason);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Reject video
router.post('/approval-queue/:id/reject', authenticate, requireRole('admin'), async (req: AuthRequest, res, next) => {
  try {
    const { reason } = req.body;
    
    if (!reason) {
      res.status(400).json({ error: 'Reason required' });
      return;
    }
    
    await approvalService.manualReject(Number(req.params.id), req.user!.id, reason);
    
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

export default router;