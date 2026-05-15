import { ethers } from "hardhat";

async function main() {
  console.log("Deploying HMall Blockchain Contracts...\n");

  // Get signers
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await ethers.provider.getBalance(deployer.address)).toString(), "\n");

  // Deploy HMallToken
  console.log("Deploying HMallToken...");
  const HMallToken = await ethers.getContractFactory("HMallToken");
  const initialSupply = ethers.parseEther("1000000"); // 1 million tokens
  const token = await HMallToken.deploy(initialSupply);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("HMallToken deployed to:", tokenAddress);

  // Deploy TransactionRegistry
  console.log("\nDeploying TransactionRegistry...");
  const TransactionRegistry = await ethers.getContractFactory("TransactionRegistry");
  const registry = await TransactionRegistry.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("TransactionRegistry deployed to:", registryAddress);

  // Deploy TaskRewardSystem
  console.log("\nDeploying TaskRewardSystem...");
  const TaskRewardSystem = await ethers.getContractFactory("TaskRewardSystem");
  const taskSystem = await TaskRewardSystem.deploy();
  await taskSystem.waitForDeployment();
  const taskSystemAddress = await taskSystem.getAddress();
  console.log("TaskRewardSystem deployed to:", taskSystemAddress);

  // Authorize backend service account as minter (using deployer for now, should be backend address)
  console.log("\nAuthorizing backend as minter...");
  const backendAddress = deployer.address; // In production, use actual backend wallet address
  await token.setMinter(backendAddress, true);
  console.log("Backend authorized as minter:", backendAddress);

  // Save deployment addresses
  const deploymentInfo = {
    network: "localhost",
    chainId: 1337,
    contracts: {
      HMallToken: tokenAddress,
      TransactionRegistry: registryAddress,
      TaskRewardSystem: taskSystemAddress,
    },
    deployer: deployer.address,
    backendMinter: backendAddress,
    timestamp: new Date().toISOString(),
  };

  console.log("\n=== Deployment Summary ===");
  console.log(JSON.stringify(deploymentInfo, null, 2));
  console.log("\n=== Save these addresses to backend/.env ===");
  console.log(`BLOCKCHAIN_TOKEN_ADDRESS=${tokenAddress}`);
  console.log(`BLOCKCHAIN_REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`BLOCKCHAIN_TASK_SYSTEM_ADDRESS=${taskSystemAddress}`);
  console.log(`BLOCKCHAIN_RPC_URL=http://localhost:8545`);
  console.log(`BLOCKCHAIN_PRIVATE_KEY=<backend_wallet_private_key>`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });





