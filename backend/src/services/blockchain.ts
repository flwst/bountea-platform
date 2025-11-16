// src/services/blockchain.ts
import { ethers } from 'ethers';
import { logger } from '../utils/logger';

const BOUNTY_ABI = [
  'function claimMilestone(string memory _videoId, uint256 _milestoneIndex, uint256 _views, uint256 _timestamp, bytes memory _signature) external',
  'function getMilestoneInfo(uint256 index) external view returns (uint256 viewCount, uint256 reward)',
  'function hasClaimed(string memory _videoId, uint256 index) external view returns (bool)',
  'function remainingFunds() external view returns (uint256)',
  'function active() external view returns (bool)',
  'event MilestoneClaimed(string indexed videoId, address indexed creator, uint256 milestoneIndex, uint256 rewardAmount, uint256 platformFee)'
];

export class BlockchainService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(
      'https://testnet-passet-hub-eth-rpc.polkadot.io'
    );
  }

  /**
   * Get bounty contract instance
   */
  getBountyContract(contractAddress: string): ethers.Contract {
    return new ethers.Contract(contractAddress, BOUNTY_ABI, this.provider);
  }

  /**
   * Check if milestone has been claimed
   */
  async hasClaimed(contractAddress: string, videoId: string, milestoneIndex: number): Promise<boolean> {
    try {
      const contract = this.getBountyContract(contractAddress);
      return await contract.hasClaimed(videoId, milestoneIndex);
    } catch (error) {
      logger.error('hasClaimed check failed:', error);
      return false;
    }
  }

  /**
   * Get milestone info from contract
   */
  async getMilestoneInfo(contractAddress: string, milestoneIndex: number): Promise<{
    viewCount: bigint;
    reward: bigint;
  }> {
    const contract = this.getBountyContract(contractAddress);
    const [viewCount, reward] = await contract.getMilestoneInfo(milestoneIndex);
    return { viewCount, reward };
  }

  /**
   * Get remaining funds in bounty
   */
  async getRemainingFunds(contractAddress: string): Promise<bigint> {
    const contract = this.getBountyContract(contractAddress);
    return await contract.remainingFunds();
  }

  /**
   * Check if bounty is active
   */
  async isActive(contractAddress: string): Promise<boolean> {
    const contract = this.getBountyContract(contractAddress);
    return await contract.active();
  }

  /**
   * Listen for MilestoneClaimed events
   */
  watchMilestoneClaimedEvents(
    contractAddress: string,
    callback: (videoId: string, creator: string, milestoneIndex: number, rewardAmount: bigint) => void
  ): void {
    const contract = this.getBountyContract(contractAddress);
    
    contract.on('MilestoneClaimed', (videoId, creator, milestoneIndex, rewardAmount) => {
      logger.info(`MilestoneClaimed event: ${videoId}, ${creator}, milestone ${milestoneIndex}`);
      callback(videoId, creator, milestoneIndex, rewardAmount);
    });
  }

  /**
   * Get transaction receipt
   */
  async getTransactionReceipt(txHash: string): Promise<ethers.TransactionReceipt | null> {
    return await this.provider.getTransactionReceipt(txHash);
  }

  /**
   * Get current block number
   */
  async getBlockNumber(): Promise<number> {
    return await this.provider.getBlockNumber();
  }
}