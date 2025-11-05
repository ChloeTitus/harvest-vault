import { FhevmType } from "@fhevm/hardhat-plugin";
import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

/**
 * Tutorial: Deploy and Interact Locally (--network localhost)
 * ===========================================================
 *
 * 1. From a separate terminal window:
 *
 *   npx hardhat node
 *
 * 2. Deploy the HarvestVault contract
 *
 *   npx hardhat --network localhost deploy
 *
 * 3. Interact with the HarvestVault contract
 *
 *   npx hardhat --network localhost task:address
 *   npx hardhat --network localhost task:batch-count --farmer <address>
 *   npx hardhat --network localhost task:decrypt-batch --batchId 0
 *
 *
 * Tutorial: Deploy and Interact on Sepolia (--network sepolia)
 * ===========================================================
 *
 * 1. Deploy the HarvestVault contract
 *
 *   npx hardhat --network sepolia deploy
 *
 * 2. Interact with the HarvestVault contract
 *
 *   npx hardhat --network sepolia task:address
 *   npx hardhat --network sepolia task:batch-count --farmer <address>
 *   npx hardhat --network sepolia task:decrypt-batch --batchId 0
 *
 */

/**
 * Example:
 *   - npx hardhat --network localhost task:address
 *   - npx hardhat --network sepolia task:address
 */
task("task:address", "Prints the HarvestVault address").setAction(async function (_taskArguments: TaskArguments, hre) {
  const { deployments } = hre;

  const harvestVault = await deployments.get("HarvestVault");

  console.log("HarvestVault address is " + harvestVault.address);
});

/**
 * Example:
 *   - npx hardhat --network localhost task:batch-count --farmer <address>
 *   - npx hardhat --network sepolia task:batch-count --farmer <address>
 */
task("task:batch-count", "Gets the batch count for a farmer")
  .addParam("farmer", "The farmer address")
  .addOptionalParam("address", "Optionally specify the HarvestVault contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const HarvestVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("HarvestVault");
    console.log(`HarvestVault: ${HarvestVaultDeployment.address}`);

    const harvestVaultContract = await ethers.getContractAt("HarvestVault", HarvestVaultDeployment.address);

    const count = await harvestVaultContract.getBatchCountByOwner(taskArguments.farmer);
    console.log(`Batch count for farmer ${taskArguments.farmer}: ${count}`);
  });

/**
 * Example:
 *   - npx hardhat --network localhost task:decrypt-batch --batchId 0
 *   - npx hardhat --network sepolia task:decrypt-batch --batchId 0
 */
task("task:decrypt-batch", "Decrypts encrypted data for a batch")
  .addParam("batchId", "The batch ID to decrypt")
  .addOptionalParam("address", "Optionally specify the HarvestVault contract address")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const HarvestVaultDeployment = taskArguments.address
      ? { address: taskArguments.address }
      : await deployments.get("HarvestVault");
    console.log(`HarvestVault: ${HarvestVaultDeployment.address}`);

    const signers = await ethers.getSigners();

    const harvestVaultContract = await ethers.getContractAt("HarvestVault", HarvestVaultDeployment.address);

    const batchId = parseInt(taskArguments.batchId);
    const [owner, cropType, batchNumber, farmer, date, isActive] = await harvestVaultContract.getBatchMeta(batchId);
    console.log(`Batch ${batchId} metadata:`);
    console.log(`  Owner: ${owner}`);
    console.log(`  Crop Type: ${cropType}`);
    console.log(`  Batch Number: ${batchNumber}`);
    console.log(`  Farmer: ${farmer}`);
    console.log(`  Date: ${new Date(Number(date) * 1000).toLocaleString()}`);
    console.log(`  Active: ${isActive}`);

    const encryptedPesticideUsage = await harvestVaultContract.getEncryptedPesticideUsage(batchId);
    const encryptedYield = await harvestVaultContract.getEncryptedYield(batchId);

    if (encryptedPesticideUsage === ethers.ZeroHash || encryptedYield === ethers.ZeroHash) {
      console.log("Batch data is not initialized");
      return;
    }

    console.log(`\nDecrypting batch ${batchId} data...`);
    const clearPesticideUsage = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPesticideUsage,
      HarvestVaultDeployment.address,
      signers[0],
    );
    const clearYield = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedYield,
      HarvestVaultDeployment.address,
      signers[0],
    );

    console.log(`\nDecrypted batch ${batchId} data:`);
    console.log(`  Pesticide Usage: ${clearPesticideUsage} kg/hectare`);
    console.log(`  Yield: ${clearYield} kg`);
  });

