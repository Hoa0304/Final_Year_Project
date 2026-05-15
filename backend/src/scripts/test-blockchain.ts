/**
 * Test script to verify blockchain is working correctly
 * Run: npx ts-node src/scripts/test-blockchain.ts
 */

import { config } from '../config/env';
import {
  isBlockchainEnabled,
  generateUserAddress,
  getTokenBalance,
  getProvider,
} from '../services/blockchain.service';
import { getContract } from '../services/blockchain.service';
import { ethers } from 'ethers';

const TOKEN_ABI = [
  'function balanceOf(address account) external view returns (uint256)',
  'function totalSupply() external view returns (uint256)',
];

const REGISTRY_ABI = [
  'function transactionCount() external view returns (uint256)',
];

async function testBlockchain() {
  console.log('🧪 Testing Blockchain Configuration...\n');

  // 1. Check if blockchain is enabled
  console.log('1️⃣ Checking blockchain configuration...');
  const enabled = isBlockchainEnabled();
  console.log(`   Blockchain enabled: ${enabled ? '✅ YES' : '❌ NO'}\n`);

  if (!enabled) {
    console.error('❌ Blockchain is not enabled. Please configure .env file:');
    console.error('   BLOCKCHAIN_RPC_URL=http://localhost:8545');
    console.error('   BLOCKCHAIN_TOKEN_ADDRESS=0x...');
    console.error('   BLOCKCHAIN_REGISTRY_ADDRESS=0x...');
    console.error('   BLOCKCHAIN_PRIVATE_KEY=0x...');
    process.exit(1);
  }

  // 2. Check RPC connection
  console.log('2️⃣ Testing RPC connection...');
  try {
    const provider = getProvider();
    const blockNumber = await provider.getBlockNumber();
    console.log(`   ✅ Connected to blockchain. Current block: ${blockNumber}\n`);
  } catch (error: any) {
    console.error(`   ❌ Cannot connect to RPC: ${error.message}`);
    console.error('   💡 Make sure Hardhat node is running: cd blockchain && npm run node');
    process.exit(1);
  }

  // 3. Check Token Contract
  console.log('3️⃣ Checking Token Contract...');
  const tokenAddress = config.blockchain?.tokenAddress;
  if (!tokenAddress) {
    console.error('   ❌ BLOCKCHAIN_TOKEN_ADDRESS not configured');
    process.exit(1);
  }

  try {
    const provider = getProvider();
    const code = await provider.getCode(tokenAddress);
    if (code === '0x' || code === '0x0') {
      console.error(`   ❌ Token contract does not exist at ${tokenAddress}`);
      console.error('   💡 Deploy contracts: cd blockchain && npm run deploy:local');
      process.exit(1);
    }
    console.log(`   ✅ Token contract found at ${tokenAddress}`);

    const tokenContract = getContract(tokenAddress, TOKEN_ABI);
    const totalSupply = await tokenContract.totalSupply();
    console.log(`   📊 Total supply: ${ethers.formatEther(totalSupply)} HMall\n`);
  } catch (error: any) {
    console.error(`   ❌ Error checking token contract: ${error.message}`);
    process.exit(1);
  }

  // 4. Check Registry Contract
  console.log('4️⃣ Checking Registry Contract...');
  const registryAddress = config.blockchain?.registryAddress;
  if (!registryAddress) {
    console.error('   ❌ BLOCKCHAIN_REGISTRY_ADDRESS not configured');
    process.exit(1);
  }

  try {
    const provider = getProvider();
    const code = await provider.getCode(registryAddress);
    if (code === '0x' || code === '0x0') {
      console.error(`   ❌ Registry contract does not exist at ${registryAddress}`);
      console.error('   💡 Deploy contracts: cd blockchain && npm run deploy:local');
      process.exit(1);
    }
    console.log(`   ✅ Registry contract found at ${registryAddress}`);

    const registryContract = getContract(registryAddress, REGISTRY_ABI);
    const txCount = await registryContract.transactionCount();
    console.log(`   📊 Total transactions: ${txCount}\n`);
  } catch (error: any) {
    console.error(`   ❌ Error checking registry contract: ${error.message}`);
    process.exit(1);
  }

  // 5. Test user address generation
  console.log('5️⃣ Testing user address generation...');
  const testUserId = 'test-user-id-123';
  const testAddress = generateUserAddress(testUserId);
  console.log(`   Test user ID: ${testUserId}`);
  console.log(`   Generated address: ${testAddress}\n`);

  // 6. Test balance query
  console.log('6️⃣ Testing balance query...');
  try {
    const balance = await getTokenBalance(testAddress);
    console.log(`   ✅ Balance query works. Test address balance: ${balance} HMall\n`);
  } catch (error: any) {
    console.error(`   ❌ Error querying balance: ${error.message}\n`);
  }

  console.log('✅ All blockchain tests passed!');
  console.log('\n💡 Next steps:');
  console.log('   1. Make sure Hardhat node is running');
  console.log('   2. Deploy contracts if not already deployed');
  console.log('   3. Update .env with contract addresses');
  console.log('   4. Restart backend');
}

// Run if called directly
if (require.main === module) {
  testBlockchain()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Test failed:', error);
      process.exit(1);
    });
}

export { testBlockchain };


