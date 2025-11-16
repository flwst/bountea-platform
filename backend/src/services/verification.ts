// src/services/verification.ts
import { ethers } from 'ethers';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { ClaimSignature } from '../types';

export class VerificationService {
  private wallet: ethers.Wallet;

  constructor() {
    this.wallet = new ethers.Wallet(env.PLATFORM_PRIVATE_KEY);
    logger.info(`Verification service initialized with address: ${this.wallet.address}`);
  }

  /**
   * Generate claim signature for approved milestone
   * This signature allows creator to claim tokens from smart contract
   */
  async generateClaimSignature(
    videoId: string,
    creatorAddress: string,
    milestoneIndex: number,
    views: number,
    contractAddress: string
  ): Promise<ClaimSignature> {
    try {
      const timestamp = Math.floor(Date.now() / 1000);

      // Build message hash (must match contract's verification logic)
      const messageHash = ethers.solidityPackedKeccak256(
        ['string', 'address', 'uint256', 'uint256', 'uint256', 'address'],
        [videoId, creatorAddress, milestoneIndex, views, timestamp, contractAddress]
      );

      // Sign the message hash
      const signature = await this.wallet.signMessage(ethers.getBytes(messageHash));

      logger.info(`Generated signature for video ${videoId}, milestone ${milestoneIndex}`);

      return {
        videoId,
        creatorAddress,
        milestoneIndex,
        views,
        timestamp,
        signature
      };

    } catch (error: any) {
      logger.error('Signature generation failed:', error.message);
      throw new Error(`Failed to generate signature: ${error.message}`);
    }
  }

  /**
   * Verify a signature is valid (for testing)
   */
  verifySignature(
    videoId: string,
    creatorAddress: string,
    milestoneIndex: number,
    views: number,
    timestamp: number,
    contractAddress: string,
    signature: string
  ): boolean {
    try {
      const messageHash = ethers.solidityPackedKeccak256(
        ['string', 'address', 'uint256', 'uint256', 'uint256', 'address'],
        [videoId, creatorAddress, milestoneIndex, views, timestamp, contractAddress]
      );

      const recoveredAddress = ethers.verifyMessage(
        ethers.getBytes(messageHash),
        signature
      );

      return recoveredAddress.toLowerCase() === this.wallet.address.toLowerCase();

    } catch (error) {
      logger.error('Signature verification failed:', error);
      return false;
    }
  }

  /**
   * Get platform verifier address
   */
  getVerifierAddress(): string {
    return this.wallet.address;
  }
}