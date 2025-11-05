import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { HarvestVault } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  farmer: HardhatEthersSigner;
  buyer: HardhatEthersSigner;
};

describe("HarvestVaultSepolia", function () {
  let signers: Signers;
  let harvestVaultContract: HarvestVault;
  let harvestVaultContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const HarvestVaultDeployment = await deployments.get("HarvestVault");
      harvestVaultContractAddress = HarvestVaultDeployment.address;
      harvestVaultContract = await ethers.getContractAt("HarvestVault", HarvestVaultDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { farmer: ethSigners[0], buyer: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("should create a harvest batch with encrypted data", async function () {
    steps = 12;

    this.timeout(5 * 60000);

    const cropType = "Wheat";
    const batchNumber = "2024-001";
    const farmerName = "John Smith";
    const pesticideUsage = 250; // 2.5 kg/hectare * 100
    const yieldAmount = 450000; // 4500 kg

    progress(`Encrypting pesticide usage ${pesticideUsage}...`);
    const encryptedPesticideUsage = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(pesticideUsage)
      .encrypt();

    progress(`Encrypting yield ${yieldAmount}...`);
    const encryptedYield = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(yieldAmount)
      .encrypt();

    progress(`Call createBatch() HarvestVault=${harvestVaultContractAddress}...`);
    const pesticideProof = encryptedPesticideUsage.inputProof;
    const yieldProof = encryptedYield.inputProof;
    let tx = await harvestVaultContract
      .connect(signers.farmer)
      .createBatch(
        cropType,
        batchNumber,
        farmerName,
        encryptedPesticideUsage.handles[0],
        encryptedYield.handles[0],
        pesticideProof,
        yieldProof
      );
    await tx.wait();

    progress(`Call getBatchMeta(0)...`);
    const [owner, storedCropType, storedBatchNumber, storedFarmer, date, isActive] =
      await harvestVaultContract.getBatchMeta(0);
    expect(owner).to.eq(signers.farmer.address);
    expect(storedCropType).to.eq(cropType);
    expect(storedBatchNumber).to.eq(batchNumber);
    expect(storedFarmer).to.eq(farmerName);
    expect(isActive).to.eq(true);

    progress(`Call getEncryptedPesticideUsage(0)...`);
    const encryptedPesticide = await harvestVaultContract.getEncryptedPesticideUsage(0);
    expect(encryptedPesticide).to.not.eq(ethers.ZeroHash);

    progress(`Call getEncryptedYield(0)...`);
    const encryptedYieldValue = await harvestVaultContract.getEncryptedYield(0);
    expect(encryptedYieldValue).to.not.eq(ethers.ZeroHash);

    progress(`Decrypting pesticide usage...`);
    const clearPesticide = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPesticide,
      harvestVaultContractAddress,
      signers.farmer,
    );
    progress(`Decrypted pesticide usage: ${clearPesticide}`);

    progress(`Decrypting yield...`);
    const clearYield = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedYieldValue,
      harvestVaultContractAddress,
      signers.farmer,
    );
    progress(`Decrypted yield: ${clearYield}`);

    expect(clearPesticide).to.eq(pesticideUsage);
    expect(clearYield).to.eq(yieldAmount);

    progress(`Batch created and verified successfully!`);
  });

  it("should authorize buyer and verify access", async function () {
    steps = 10;

    this.timeout(5 * 60000);

    const cropType = "Corn";
    const batchNumber = "2024-002";
    const farmerName = "Sarah Johnson";
    const pesticideUsage = 180;
    const yieldAmount = 520000;

    progress(`Encrypting data...`);
    const encryptedPesticideUsage = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(pesticideUsage)
      .encrypt();

    const encryptedYield = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(yieldAmount)
      .encrypt();

    progress(`Creating batch...`);
    const pesticideProof = encryptedPesticideUsage.inputProof;
    const yieldProof = encryptedYield.inputProof;
    let tx = await harvestVaultContract
      .connect(signers.farmer)
      .createBatch(
        cropType,
        batchNumber,
        farmerName,
        encryptedPesticideUsage.handles[0],
        encryptedYield.handles[0],
        pesticideProof,
        yieldProof
      );
    await tx.wait();

    const batchId = 0;

    progress(`Checking authorization (should be false)...`);
    const isAuthorizedBefore = await harvestVaultContract.isBuyerAuthorized(
      signers.farmer.address,
      signers.buyer.address
    );
    expect(isAuthorizedBefore).to.eq(false);

    progress(`Authorizing buyer...`);
    tx = await harvestVaultContract.connect(signers.farmer).authorizeBuyer(signers.buyer.address, batchId);
    await tx.wait();

    progress(`Verifying authorization (should be true)...`);
    const isAuthorizedAfter = await harvestVaultContract.isBuyerAuthorized(
      signers.farmer.address,
      signers.buyer.address
    );
    expect(isAuthorizedAfter).to.eq(true);

    progress(`Authorization verified successfully!`);
  });
});
