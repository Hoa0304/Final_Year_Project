import { ethers } from 'ethers';
import { config } from '../config/env';

/**
 * Blockchain Service
 * Handles interaction with HMall smart contracts on local blockchain
 */

// Contract ABIs (simplified - in production, import from artifacts)
const TOKEN_ABI = [
  'function mint(address to, uint256 amount) external',
  'function burn(address from, uint256 amount) external',
  'function balanceOf(address account) external view returns (uint256)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function setMinter(address minter, bool authorized) external',
];

export const REGISTRY_ABI = [
  'function registerTransaction(address user, string memory transactionType, uint256 amount, uint256 balanceBefore, uint256 balanceAfter, string memory description, bytes32 referenceId, string memory referenceType, address createdBy) external returns (uint256)',
  'function getTransaction(uint256 txId) external view returns (tuple(uint256 id, address user, string transactionType, uint256 amount, uint256 balanceBefore, uint256 balanceAfter, string description, bytes32 referenceId, string referenceType, address createdBy, uint256 timestamp, bool exists))',
  'function getUserTransactionIds(address user) external view returns (uint256[])',
  'function transactionCount() external view returns (uint256)',
];

const TASK_SYSTEM_ABI = [
  'function claimTaskReward(bytes32 taskId, address user, uint256 rewardAmount) external returns (bool)',
  'function isTaskRewardClaimed(bytes32 taskId, address user) external view returns (bool)',
  'function getTaskCompletion(bytes32 taskId, address user) external view returns (tuple(bytes32 taskId, address user, uint256 rewardAmount, uint256 timestamp, bool claimed))',
];

/**
 * Get blockchain provider
 */
export function getProvider(): ethers.JsonRpcProvider {
  const rpcUrl = config.blockchain?.rpcUrl || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(rpcUrl);
}

/**
 * Get blockchain wallet (backend service wallet)
 */
function getWallet(): ethers.Wallet {
  const provider = getProvider();
  const privateKey = config.blockchain?.privateKey;
  
  if (!privateKey) {
    throw new Error('BLOCKCHAIN_PRIVATE_KEY not configured');
  }

  return new ethers.Wallet(privateKey, provider);
}

/**
 * Get contract instance
 */
export function getContract(address: string, abi: string[]): ethers.Contract {
  const wallet = getWallet();
  return new ethers.Contract(address, abi, wallet);
}

/**
 * Convert UUID string to bytes32 hash
 */
function uuidToBytes32(uuid: string): string {
  // Remove hyphens and convert to bytes32
  const hex = uuid.replace(/-/g, '');
  // Pad to 64 characters (32 bytes)
  return '0x' + hex.padEnd(64, '0').substring(0, 64);
}

/**
 * Mint tokens to a user address
 * @param userAddress User's blockchain address
 * @param amount Amount in tokens (will be converted to wei)
 */
export async function mintTokens(userAddress: string, amount: number): Promise<string> {
  try {
    const tokenAddress = config.blockchain?.tokenAddress;
    if (!tokenAddress) {
      throw new Error('BLOCKCHAIN_TOKEN_ADDRESS not configured');
    }

    console.log(`   📍 Token address: ${tokenAddress}`);

    // Check if contract exists
    const provider = getProvider();
    const code = await provider.getCode(tokenAddress);
    if (code === '0x' || code === '0x0') {
      throw new Error(`Token contract does not exist at address ${tokenAddress}. Please deploy contracts first.`);
    }
    console.log(`   ✅ Token contract found`);

    const tokenContract = getContract(tokenAddress, TOKEN_ABI);
    const amountWei = ethers.parseEther(amount.toString());

    console.log(`   💰 Minting ${amount} tokens (${amountWei.toString()} wei) to ${userAddress}...`);
    const tx = await tokenContract.mint(userAddress, amountWei);
    console.log(`   ⏳ Waiting for mint transaction confirmation... (TX Hash: ${tx.hash})`);
    
    const receipt = await tx.wait();
    console.log(`   ✅ Mint transaction confirmed in block ${receipt.blockNumber}`);

    // Verify balance was updated
    const newBalance = await tokenContract.balanceOf(userAddress);
    const newBalanceFormatted = parseFloat(ethers.formatEther(newBalance));
    console.log(`   ✅ New token balance: ${newBalanceFormatted} HMALL`);

    return tx.hash;
  } catch (error: any) {
    console.error('❌ Blockchain mint error:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
    });
    throw new Error(`Failed to mint tokens: ${error.message}`);
  }
}

/**
 * Burn tokens from a user address
 * @param userAddress User's blockchain address
 * @param amount Amount in tokens (will be converted to wei)
 */
export async function burnTokens(userAddress: string, amount: number): Promise<string> {
  try {
    const tokenAddress = config.blockchain?.tokenAddress;
    if (!tokenAddress) {
      throw new Error('BLOCKCHAIN_TOKEN_ADDRESS not configured');
    }

    // Check if contract exists
    const provider = getProvider();
    const code = await provider.getCode(tokenAddress);
    if (code === '0x' || code === '0x0') {
      throw new Error(`Token contract does not exist at address ${tokenAddress}. Please deploy contracts first.`);
    }

    const tokenContract = getContract(tokenAddress, TOKEN_ABI);
    const amountWei = ethers.parseEther(amount.toString());

    const tx = await tokenContract.burn(userAddress, amountWei);
    await tx.wait();

    console.log(`✅ Burned ${amount} tokens from ${userAddress}, tx: ${tx.hash}`);
    return tx.hash;
  } catch (error: any) {
    console.error('Blockchain burn error:', error);
    throw new Error(`Failed to burn tokens: ${error.message}`);
  }
}

/**
 * Get token balance for a user address
 * @param userAddress User's blockchain address
 * @returns Balance in tokens (converted from wei)
 */
export async function getTokenBalance(userAddress: string): Promise<number> {
  try {
    const tokenAddress = config.blockchain?.tokenAddress;
    if (!tokenAddress) {
      throw new Error('BLOCKCHAIN_TOKEN_ADDRESS not configured');
    }

    const tokenContract = getContract(tokenAddress, TOKEN_ABI);
    
    // Check if contract exists by trying to get code
    const provider = getProvider();
    const code = await provider.getCode(tokenAddress);
    if (code === '0x' || code === '0x0') {
      console.warn(`Token contract does not exist at address ${tokenAddress}`);
      return 0;
    }

    const balanceWei = await tokenContract.balanceOf(userAddress);
    const balance = parseFloat(ethers.formatEther(balanceWei));

    return balance;
  } catch (error: any) {
    // If it's a decode error, contract might not exist or ABI mismatch
    if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
      console.warn(`Could not decode balance for ${userAddress}, contract may not exist or ABI mismatch`);
      return 0;
    }
    console.error('Blockchain balance error:', error);
    throw new Error(`Failed to get token balance: ${error.message}`);
  }
}

/**
 * Register a transaction on blockchain
 * @param params Transaction parameters
 * @returns Transaction ID on blockchain
 */
export interface RegisterTransactionParams {
  userAddress: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description?: string;
  referenceId?: string;
  referenceType?: string;
  createdByAddress?: string;
}

export async function registerTransaction(params: RegisterTransactionParams): Promise<number> {
  try {
    const registryAddress = config.blockchain?.registryAddress;
    if (!registryAddress) {
      throw new Error('BLOCKCHAIN_REGISTRY_ADDRESS not configured');
    }

    console.log(`   📍 Registry address: ${registryAddress}`);

    // Check if contract exists
    const provider = getProvider();
    const code = await provider.getCode(registryAddress);
    if (code === '0x' || code === '0x0') {
      throw new Error(`Registry contract does not exist at address ${registryAddress}. Please deploy contracts first.`);
    }
    console.log(`   ✅ Registry contract found`);

    const registryContract = getContract(registryAddress, REGISTRY_ABI);
    
    // Convert amounts to wei
    const amountWei = ethers.parseEther(params.amount.toString());
    const balanceBeforeWei = ethers.parseEther(params.balanceBefore.toString());
    const balanceAfterWei = ethers.parseEther(params.balanceAfter.toString());

    console.log(`   💰 Amount: ${params.amount} → ${amountWei.toString()} wei`);
    console.log(`   📊 Balance: ${params.balanceBefore} → ${params.balanceAfter}`);

    // Convert reference ID to bytes32
    const referenceIdBytes32 = params.referenceId 
      ? uuidToBytes32(params.referenceId)
      : '0x0000000000000000000000000000000000000000000000000000000000000000';

    // Set createdBy to zero address if not provided
    const createdBy = params.createdByAddress || ethers.ZeroAddress;

    console.log(`   📤 Calling registerTransaction on smart contract...`);
    const tx = await registryContract.registerTransaction(
      params.userAddress,
      params.transactionType,
      amountWei,
      balanceBeforeWei,
      balanceAfterWei,
      params.description || '',
      referenceIdBytes32,
      params.referenceType || '',
      createdBy
    );

    console.log(`   ⏳ Waiting for transaction confirmation... (TX Hash: ${tx.hash})`);
    const receipt = await tx.wait();
    console.log(`   ✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Get transaction ID from event or return receipt
    // For simplicity, we'll use the transaction count
    const txCount = await registryContract.transactionCount();
    const txId = Number(txCount);
    console.log(`   📝 Blockchain transaction ID: ${txId}`);
    
    return txId;
  } catch (error: any) {
    console.error('❌ Blockchain register transaction error:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      reason: error.reason,
    });
    throw new Error(`Failed to register transaction: ${error.message}`);
  }
}

/**
 * Get user transaction IDs from blockchain
 * @param userAddress User's blockchain address
 */
export async function getUserTransactionIds(userAddress: string): Promise<number[]> {
  try {
    const registryAddress = config.blockchain?.registryAddress;
    if (!registryAddress) {
      throw new Error('BLOCKCHAIN_REGISTRY_ADDRESS not configured');
    }

    // Check if contract exists
    const provider = getProvider();
    const code = await provider.getCode(registryAddress);
    if (code === '0x' || code === '0x0') {
      console.warn(`Registry contract does not exist at address ${registryAddress}`);
      return [];
    }

    const registryContract = getContract(registryAddress, REGISTRY_ABI);
    const txIds = await registryContract.getUserTransactionIds(userAddress);
    return txIds.map((id: bigint) => Number(id));
  } catch (error: any) {
    // If it's a decode error, contract might not exist or ABI mismatch
    if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
      console.warn(`Could not decode transactions for ${userAddress}, contract may not exist or ABI mismatch`);
      return [];
    }
    console.error('Blockchain get user transactions error:', error);
    throw new Error(`Failed to get user transactions: ${error.message}`);
  }
}

/**
 * Get transaction from blockchain
 * @param txId Transaction ID
 */
export async function getBlockchainTransaction(txId: number) {
  try {
    const registryAddress = config.blockchain?.registryAddress;
    if (!registryAddress) {
      throw new Error('BLOCKCHAIN_REGISTRY_ADDRESS not configured');
    }

    // Check if contract exists
    const provider = getProvider();
    const code = await provider.getCode(registryAddress);
    if (code === '0x' || code === '0x0') {
      throw new Error(`Registry contract does not exist at address ${registryAddress}`);
    }

    const registryContract = getContract(registryAddress, REGISTRY_ABI);
    const tx = await registryContract.getTransaction(txId);

    return {
      id: Number(tx.id),
      user: tx.user,
      transactionType: tx.transactionType,
      amount: parseFloat(ethers.formatEther(tx.amount)),
      balanceBefore: parseFloat(ethers.formatEther(tx.balanceBefore)),
      balanceAfter: parseFloat(ethers.formatEther(tx.balanceAfter)),
      description: tx.description,
      referenceId: tx.referenceId,
      referenceType: tx.referenceType,
      createdBy: tx.createdBy,
      timestamp: Number(tx.timestamp),
    };
  } catch (error: any) {
    if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
      throw new Error(`Transaction ${txId} not found or contract ABI mismatch`);
    }
    console.error('Blockchain get transaction error:', error);
    throw new Error(`Failed to get transaction: ${error.message}`);
  }
}

/**
 * Claim task reward on blockchain
 * @param taskId Task UUID
 * @param userAddress User's blockchain address
 * @param rewardAmount Reward amount
 */
export async function claimTaskReward(
  taskId: string,
  userAddress: string,
  rewardAmount: number
): Promise<string> {
  try {
    const taskSystemAddress = config.blockchain?.taskSystemAddress;
    if (!taskSystemAddress) {
      throw new Error('BLOCKCHAIN_TASK_SYSTEM_ADDRESS not configured');
    }

    const taskSystemContract = getContract(taskSystemAddress, TASK_SYSTEM_ABI);
    const taskIdBytes32 = uuidToBytes32(taskId);
    const rewardWei = ethers.parseEther(rewardAmount.toString());

    const tx = await taskSystemContract.claimTaskReward(taskIdBytes32, userAddress, rewardWei);
    await tx.wait();

    return tx.hash;
  } catch (error: any) {
    console.error('Blockchain claim task reward error:', error);
    throw new Error(`Failed to claim task reward: ${error.message}`);
  }
}

/**
 * Check if task reward was already claimed
 * @param taskId Task UUID
 * @param userAddress User's blockchain address
 */
export async function isTaskRewardClaimed(taskId: string, userAddress: string): Promise<boolean> {
  try {
    const taskSystemAddress = config.blockchain?.taskSystemAddress;
    if (!taskSystemAddress) {
      throw new Error('BLOCKCHAIN_TASK_SYSTEM_ADDRESS not configured');
    }

    const taskSystemContract = getContract(taskSystemAddress, TASK_SYSTEM_ABI);
    const taskIdBytes32 = uuidToBytes32(taskId);

    return await taskSystemContract.isTaskRewardClaimed(taskIdBytes32, userAddress);
  } catch (error: any) {
    console.error('Blockchain check task reward error:', error);
    return false; // Return false on error to allow fallback
  }
}

/**
 * Generate blockchain address from user ID
 * This creates a deterministic address for each user
 * In production, users should have their own wallets
 */
export function generateUserAddress(userId: string): string {
  // Use keccak256 hash of user ID to generate deterministic address
  // This is a simple approach - in production, users should have their own wallets
  const hash = ethers.keccak256(ethers.toUtf8Bytes(userId));
  // Take first 20 bytes (40 hex chars) as address
  return '0x' + hash.substring(2, 42);
}

/**
 * Get all transactions from blockchain (admin only)
 * @param limit Maximum number of transactions to return
 * @param offset Offset for pagination
 */
export async function getAllBlockchainTransactions(limit: number = 100, offset: number = 0) {
  try {
    const registryAddress = config.blockchain?.registryAddress;
    if (!registryAddress) {
      throw new Error('BLOCKCHAIN_REGISTRY_ADDRESS not configured');
    }

    // Check if contract exists
    const provider = getProvider();
    const code = await provider.getCode(registryAddress);
    if (code === '0x' || code === '0x0') {
      console.warn(`Registry contract does not exist at address ${registryAddress}`);
      return {
        transactions: [],
        total: 0,
        limit,
        offset,
      };
    }

    const registryContract = getContract(registryAddress, REGISTRY_ABI);
    
    // Get total transaction count
    const totalCount = await registryContract.transactionCount();
    const totalCountNumber = Number(totalCount);

    // Calculate range
    const startId = Math.max(1, totalCountNumber - offset);
    const endId = Math.max(1, startId - limit + 1);

    // Fetch transactions in reverse order (newest first)
    const transactions = [];
    for (let txId = startId; txId >= endId && txId >= 1; txId--) {
      try {
        const tx = await registryContract.getTransaction(txId);
        if (tx.exists) {
          transactions.push({
            id: Number(tx.id),
            user: tx.user,
            transactionType: tx.transactionType,
            amount: parseFloat(ethers.formatEther(tx.amount)),
            balanceBefore: parseFloat(ethers.formatEther(tx.balanceBefore)),
            balanceAfter: parseFloat(ethers.formatEther(tx.balanceAfter)),
            description: tx.description,
            referenceId: tx.referenceId,
            referenceType: tx.referenceType,
            createdBy: tx.createdBy,
            timestamp: Number(tx.timestamp),
          });
        }
      } catch (error: any) {
        // Skip if transaction doesn't exist or decode error
        if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
          console.warn(`Transaction ${txId} decode error, skipping`);
        } else {
          console.warn(`Transaction ${txId} does not exist, skipping`);
        }
      }
    }

    return {
      transactions,
      total: totalCountNumber,
      limit,
      offset,
    };
  } catch (error: any) {
    // If it's a decode error, contract might not exist or ABI mismatch
    if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
      console.warn('Could not decode blockchain transactions, contract may not exist or ABI mismatch');
      return {
        transactions: [],
        total: 0,
        limit,
        offset,
      };
    }
    console.error('Blockchain get all transactions error:', error);
    throw new Error(`Failed to get all transactions: ${error.message}`);
  }
}

/**
 * Verify transaction exists on blockchain
 * @param txId Transaction ID to verify
 */
export async function verifyTransactionOnBlockchain(txId: number): Promise<boolean> {
  try {
    const registryAddress = config.blockchain?.registryAddress;
    if (!registryAddress) {
      return false;
    }

    // Check if contract exists
    const provider = getProvider();
    const code = await provider.getCode(registryAddress);
    if (code === '0x' || code === '0x0') {
      return false;
    }

    const registryContract = getContract(registryAddress, REGISTRY_ABI);
    const tx = await registryContract.getTransaction(txId);
    return tx.exists;
  } catch (error: any) {
    if (error.code === 'BAD_DATA' || error.message?.includes('could not decode')) {
      return false;
    }
    return false;
  }
}

/**
 * Verify user balance matches between database and blockchain
 * @param userId User ID
 * @param databaseBalance Balance from database
 */
export async function verifyUserBalance(userId: string, databaseBalance: number): Promise<{
  match: boolean;
  blockchainBalance: number;
  discrepancy?: number;
}> {
  try {
    if (!isBlockchainEnabled()) {
      return {
        match: false,
        blockchainBalance: 0,
        discrepancy: databaseBalance,
      };
    }

    const userAddress = generateUserAddress(userId);
    const blockchainBalance = await getTokenBalance(userAddress);
    const match = Math.abs(databaseBalance - blockchainBalance) < 0.01; // Allow small floating point differences

    return {
      match,
      blockchainBalance,
      discrepancy: match ? undefined : databaseBalance - blockchainBalance,
    };
  } catch (error: any) {
    console.error('Verify user balance error:', error);
    return {
      match: false,
      blockchainBalance: 0,
      discrepancy: databaseBalance,
    };
  }
}

/**
 * Check if blockchain is enabled and configured
 */
export function isBlockchainEnabled(): boolean {
  const enabled = !!(
    config.blockchain?.rpcUrl &&
    config.blockchain?.tokenAddress &&
    config.blockchain?.registryAddress &&
    config.blockchain?.privateKey
  );

  if (!enabled) {
    console.warn('⚠️  Blockchain is not fully configured:');
    if (!config.blockchain?.rpcUrl) console.warn('   - BLOCKCHAIN_RPC_URL is missing');
    if (!config.blockchain?.tokenAddress) console.warn('   - BLOCKCHAIN_TOKEN_ADDRESS is missing');
    if (!config.blockchain?.registryAddress) console.warn('   - BLOCKCHAIN_REGISTRY_ADDRESS is missing');
    if (!config.blockchain?.privateKey) console.warn('   - BLOCKCHAIN_PRIVATE_KEY is missing');
  }

  return enabled;
}

