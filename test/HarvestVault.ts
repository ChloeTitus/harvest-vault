import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { HarvestVault, HarvestVault__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  farmer: HardhatEthersSigner;
  buyer: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("HarvestVault")) as HarvestVault__factory;
  const harvestVaultContract = (await factory.deploy()) as HarvestVault;
  const harvestVaultContractAddress = await harvestVaultContract.getAddress();

  return { harvestVaultContract, harvestVaultContractAddress };
}

describe("HarvestVault", function () {
  let signers: Signers;
  let harvestVaultContract: HarvestVault;
  let harvestVaultContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], farmer: ethSigners[1], buyer: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ harvestVaultContract, harvestVaultContractAddress } = await deployFixture());
  });

  it("should have zero batches after deployment", async function () {
    const totalCount = await harvestVaultContract.getTotalBatchCount();
    expect(totalCount).to.eq(0);

    const farmerCount = await harvestVaultContract.getBatchCountByOwner(signers.farmer.address);
    expect(farmerCount).to.eq(0);
  });

  it("should create a harvest batch with encrypted data", async function () {
    const cropType = "Wheat";
    const batchNumber = "2024-001";
    const farmerName = "John Smith";
    const pesticideUsage = 250; // 2.5 kg/hectare * 100 (stored as integer)
    const yieldAmount = 450000; // 4500 kg (stored as integer)

    // Encrypt pesticide usage and yield separately
    const encryptedPesticideUsage = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(pesticideUsage)
      .encrypt();

    const encryptedYield = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(yieldAmount)
      .encrypt();

    // Each encrypted value has its own proof
    const pesticideProof = encryptedPesticideUsage.inputProof;
    const yieldProof = encryptedYield.inputProof;

    const tx = await harvestVaultContract
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

    // Verify batch was created
    const totalCount = await harvestVaultContract.getTotalBatchCount();
    expect(totalCount).to.eq(1);

    const farmerCount = await harvestVaultContract.getBatchCountByOwner(signers.farmer.address);
    expect(farmerCount).to.eq(1);

    // Verify metadata
    const [owner, storedCropType, storedBatchNumber, storedFarmer, date, isActive] =
      await harvestVaultContract.getBatchMeta(0);
    expect(owner).to.eq(signers.farmer.address);
    expect(storedCropType).to.eq(cropType);
    expect(storedBatchNumber).to.eq(batchNumber);
    expect(storedFarmer).to.eq(farmerName);
    expect(isActive).to.eq(true);

    // Verify encrypted data exists
    const encryptedPesticide = await harvestVaultContract.getEncryptedPesticideUsage(0);
    const encryptedYieldValue = await harvestVaultContract.getEncryptedYield(0);
    expect(encryptedPesticide).to.not.eq(ethers.ZeroHash);
    expect(encryptedYieldValue).to.not.eq(ethers.ZeroHash);

    // Decrypt and verify values
    const clearPesticide = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedPesticide,
      harvestVaultContractAddress,
      signers.farmer,
    );
    const clearYield = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      encryptedYieldValue,
      harvestVaultContractAddress,
      signers.farmer,
    );

    expect(clearPesticide).to.eq(pesticideUsage);
    expect(clearYield).to.eq(yieldAmount);
  });

  it("should authorize buyer to access batch data", async function () {
    const cropType = "Corn";
    const batchNumber = "2024-002";
    const farmerName = "Sarah Johnson";
    const pesticideUsage = 180;
    const yieldAmount = 520000;

    // Create batch
    const encryptedPesticideUsage = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(pesticideUsage)
      .encrypt();

    const encryptedYield = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(yieldAmount)
      .encrypt();

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

    // Check initial authorization
    const isAuthorizedBefore = await harvestVaultContract.isBuyerAuthorized(
      signers.farmer.address,
      signers.buyer.address
    );
    expect(isAuthorizedBefore).to.eq(false);

    // Authorize buyer
    tx = await harvestVaultContract.connect(signers.farmer).authorizeBuyer(signers.buyer.address, batchId);
    await tx.wait();

    // Verify authorization
    const isAuthorizedAfter = await harvestVaultContract.isBuyerAuthorized(
      signers.farmer.address,
      signers.buyer.address
    );
    expect(isAuthorizedAfter).to.eq(true);

    // Buyer should be able to decrypt (assuming ACL is properly set)
    const encryptedPesticide = await harvestVaultContract.getEncryptedPesticideUsage(batchId);
    const encryptedYieldValue = await harvestVaultContract.getEncryptedYield(batchId);

    // Note: In a real scenario, the buyer would need to decrypt using their own keypair
    // This test verifies the authorization structure
  });

  it("should reject authorization from non-owner", async function () {
    const cropType = "Potato";
    const batchNumber = "2024-003";
    const farmerName = "Mike Wilson";
    const pesticideUsage = 200;
    const yieldAmount = 300000;

    // Create batch
    const encryptedPesticideUsage = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(pesticideUsage)
      .encrypt();

    const encryptedYield = await fhevm
      .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
      .add32(yieldAmount)
      .encrypt();

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

    // Try to authorize buyer from non-owner (should fail)
    await expect(
      harvestVaultContract.connect(signers.buyer).authorizeBuyer(signers.buyer.address, batchId)
    ).to.be.revertedWith("Only owner can authorize buyers");
  });

  it("should return batch IDs for owner", async function () {
    // Create multiple batches
    const pesticideUsage = 250;
    const yieldAmount = 450000;

    for (let i = 0; i < 3; i++) {
      const encryptedPesticideUsage = await fhevm
        .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
        .add32(pesticideUsage)
        .encrypt();

      const encryptedYield = await fhevm
        .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
        .add32(yieldAmount)
        .encrypt();

      // Each encrypted value has its own proof
      const pesticideProof = encryptedPesticideUsage.inputProof;
      const yieldProof = encryptedYield.inputProof;

      const tx = await harvestVaultContract
        .connect(signers.farmer)
        .createBatch(
          `Crop${i}`,
          `2024-00${i}`,
          `Farmer${i}`,
          encryptedPesticideUsage.handles[0],
          encryptedYield.handles[0],
          pesticideProof,
          yieldProof
        );
      await tx.wait();
    }

    const batchIds = await harvestVaultContract.getBatchIdsByOwner(signers.farmer.address);
    expect(batchIds.length).to.eq(3);
    expect(batchIds[0]).to.eq(0);
    expect(batchIds[1]).to.eq(1);
    expect(batchIds[2]).to.eq(2);
  });

  it("should authorize buyer for all active batches", async function () {
    // Create multiple batches
    const pesticideUsage = 250;
    const yieldAmount = 450000;

    for (let i = 0; i < 3; i++) {
      const encryptedPesticideUsage = await fhevm
        .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
        .add32(pesticideUsage)
        .encrypt();

      const encryptedYield = await fhevm
        .createEncryptedInput(harvestVaultContractAddress, signers.farmer.address)
        .add32(yieldAmount)
        .encrypt();

      const pesticideProof = encryptedPesticideUsage.inputProof;
      const yieldProof = encryptedYield.inputProof;

      const tx = await harvestVaultContract
        .connect(signers.farmer)
        .createBatch(
          `Crop${i}`,
          `2024-00${i}`,
          `Farmer${i}`,
          encryptedPesticideUsage.handles[0],
          encryptedYield.handles[0],
          pesticideProof,
          yieldProof
        );
      await tx.wait();
    }

    // Authorize buyer for all batches
    const tx = await harvestVaultContract
      .connect(signers.farmer)
      .authorizeBuyerForAllBatches(signers.buyer.address);
    await tx.wait();

    // Verify buyer is authorized
    const isAuthorized = await harvestVaultContract.isBuyerAuthorized(signers.farmer.address, signers.buyer.address);
    expect(isAuthorized).to.be.true;

    // Try to authorize again (should fail)
    await expect(
      harvestVaultContract.connect(signers.farmer).authorizeBuyerForAllBatches(signers.buyer.address)
    ).to.be.revertedWith("Buyer already authorized");
  });
});
