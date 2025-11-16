// src/routes/auth.ts
// Authentication routes - JWT token generation and validation

import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { cryptoWaitReady, signatureVerify } from '@polkadot/util-crypto';

const router = Router();

/**
 * POST /api/auth/login
 * 
 * Authenticate user with wallet signature
 * 
 * Request body:
 * - wallet: string (Ethereum address)
 * - signature: string (Signed message)
 * - message: string (Original message that was signed)
 * 
 * Response:
 * - token: string (JWT token)
 * - user: object (User details)
 */
router.post('/login', async (req, res) => {
  try {
    const { wallet, signature, message } = req.body;
    
    // Validate inputs
    if (!wallet || !signature || !message) {
      logger.warn('Login attempt with missing fields');
      res.status(400).json({ error: 'Missing required fields: wallet, signature, message' });
      return;
    }
    
    // Verify Polkadot signature
    try {
      await cryptoWaitReady();
      
      // Verify the signature using Polkadot's signatureVerify
      const isValid = signatureVerify(message, signature, wallet);
      
      if (!isValid.isValid) {
        logger.warn(`Signature verification failed for wallet: ${wallet}`);
        res.status(401).json({ error: 'Invalid signature' });
        return;
      }
      
      logger.info(`Signature verified successfully for wallet: ${wallet}`);
    } catch (error) {
      logger.error('Signature verification failed:', error);
      res.status(401).json({ error: 'Invalid signature format' });
      return;
    }
    
    // Check message timestamp (prevent replay attacks)
    const timestampMatch = message.match(/(\d+)$/);
    if (!timestampMatch) {
      res.status(401).json({ error: 'Invalid message format' });
      return;
    }
    
    const timestamp = parseInt(timestampMatch[1]);
    const now = Date.now();
    const age = now - timestamp;
    
    if (age > 5 * 60 * 1000) { // 5 minutes expiry
      logger.warn(`Expired signature: ${age}ms old`);
      res.status(401).json({ error: 'Signature expired. Please try again.' });
      return;
    }
    
    if (age < 0) {
      logger.warn('Future timestamp detected - possible clock skew');
      res.status(401).json({ error: 'Invalid timestamp' });
      return;
    }
    
    // Create or get user
    const user = await prisma.user.upsert({
      where: { wallet: wallet.toLowerCase() },
      create: {
        wallet: wallet.toLowerCase(),
        userType: 'creator', // Default type
        displayName: `${wallet.substring(0, 6)}...${wallet.substring(wallet.length - 4)}`,
        email: '' // Optional field
      },
      update: { 
        lastLoginAt: new Date()
      }
    });
    
    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,  // Note: using 'id', not 'userId'
        wallet: user.wallet,
        userType: user.userType
      },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    logger.info(`Login successful for wallet: ${wallet}`);
    
    res.json({
      token,
      user: {
        id: user.id,
        wallet: user.wallet,
        userType: user.userType,
        displayName: user.displayName
      }
    });
    
  } catch (error: any) {
    logger.error('Login error:', error);
    res.status(500).json({ 
      error: 'Login failed',
      details: env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/auth/me
 * 
 * Get current user info (requires valid JWT)
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      res.status(401).json({ error: 'No token provided' });
      return;
    }
    
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      id: string;
      wallet: string;
      userType: string;
    };
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        wallet: true,
        userType: true,
        displayName: true,
        email: true
      }
    });
    
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }
    
    res.json({ user });
    
  } catch (error: any) {
    logger.error('Auth verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

export default router;