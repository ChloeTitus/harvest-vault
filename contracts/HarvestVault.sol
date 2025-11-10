// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, externalEuint32} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title HarvestVault - Privacy-preserving harvest data storage with FHE
/// @notice Stores encrypted harvest batch data where pesticide usage and yield are protected by FHE encryption
/// @dev Public data (cropType, batchNumber, farmer, date) is stored in plaintext for listing
///      Sensitive data (pesticideUsage, yield) is encrypted using FHE
contract HarvestVault is SepoliaConfig {
    // Constants for gas optimization
    uint256 private constant MAX_BATCHES_PER_FARMER = 1000;
    uint256 private constant PESTICIDE_DECIMALS = 100; // For kg/hectare precision
    uint256 private constant YIELD_DECIMALS = 1; // For kg precision

    struct HarvestBatch {
        address owner;                    // Farmer address
        string cropType;                  // Plaintext: e.g., "Wheat", "Corn"
        string batchNumber;               // Plaintext: e.g., "2024-001"
        string farmer;                    // Plaintext: Farmer name
        uint64 date;                      // Plaintext: Timestamp
        euint32 encryptedPesticideUsage;  // FHE-encrypted pesticide usage (kg/hectare)
        euint32 encryptedYield;           // FHE-encrypted yield (kg)
        bool isActive;                    // Whether batch is active
    }

    // Authorization: farmer -> buyer -> authorized
    mapping(address => mapping(address => bool)) private _authorizedBuyers;

    // Batch storage
    HarvestBatch[] private _batches;
    
    // Indexing: owner -> batch IDs
    mapping(address => uint256[]) private _batchesOf;

    event BatchCreated(
        uint256 indexed batchId,
        address indexed owner,
        string cropType,
        string batchNumber,
        uint64 date
    );

    event BuyerAuthorized(
        address indexed farmer,
        address indexed buyer,
        uint256 indexed batchId
    );

    event BatchDeactivated(
        address indexed owner,
        uint256 indexed batchId,
        uint64 deactivatedAt
    );

    event BulkAuthorizationCompleted(
        address indexed farmer,
        address indexed buyer,
        uint256 authorizedBatchCount
    );

    /// @notice Create a new harvest batch with encrypted data
    /// @param cropType Plaintext crop type (e.g., "Wheat")
    /// @param batchNumber Plaintext batch number (e.g., "2024-001")
    /// @param farmer Plaintext farmer name
    /// @param encPesticideUsage External encrypted pesticide usage handle
    /// @param encYield External encrypted yield handle
    /// @param pesticideProof The Zama input proof for pesticide usage
    /// @param yieldProof The Zama input proof for yield
    /// @return batchId The ID of the newly created batch
    function createBatch(
        string calldata cropType,
        string calldata batchNumber,
        string calldata farmer,
        externalEuint32 encPesticideUsage,
        externalEuint32 encYield,
        bytes calldata pesticideProof,
        bytes calldata yieldProof
    ) external returns (uint256 batchId) {
        require(_batchesOf[msg.sender].length < MAX_BATCHES_PER_FARMER, "Maximum batches per farmer exceeded");

        // Convert external encrypted inputs to internal encrypted values
        euint32 pesticideUsage = FHE.fromExternal(encPesticideUsage, pesticideProof);
        euint32 yield = FHE.fromExternal(encYield, yieldProof);

        HarvestBatch memory batch;
        batch.owner = msg.sender;
        batch.cropType = cropType;
        batch.batchNumber = batchNumber;
        batch.farmer = farmer;
        batch.date = uint64(block.timestamp);
        batch.encryptedPesticideUsage = pesticideUsage;
        batch.encryptedYield = yield;
        batch.isActive = true;

        // Persist batch
        _batches.push(batch);
        batchId = _batches.length - 1;
        _batchesOf[msg.sender].push(batchId);

        // ACL: Allow contract and owner to access encrypted data for decryption
        FHE.allowThis(_batches[batchId].encryptedPesticideUsage);
        FHE.allow(_batches[batchId].encryptedPesticideUsage, msg.sender);
        FHE.allowThis(_batches[batchId].encryptedYield);
        FHE.allow(_batches[batchId].encryptedYield, msg.sender);

        emit BatchCreated(batchId, msg.sender, cropType, batchNumber, batch.date);
    }

    /// @notice Authorize a buyer to access a specific batch's encrypted data
    /// @param buyer The buyer address to authorize
    /// @param batchId The batch ID to grant access to
    function authorizeBuyer(address buyer, uint256 batchId) external {
        require(buyer != address(0), "Invalid buyer address");
        require(buyer != msg.sender, "Cannot authorize yourself");
        require(batchId < _batches.length, "Batch does not exist");

        HarvestBatch storage batch = _batches[batchId];
        require(batch.owner == msg.sender, "Only owner can authorize buyers");
        require(batch.isActive, "Batch is not active");
        require(batch.owner != address(0), "Invalid batch owner");
        require(!_authorizedBuyers[msg.sender][buyer], "Buyer already authorized");

        _authorizedBuyers[msg.sender][buyer] = true;

        // Grant buyer access to encrypted data
        FHE.allow(batch.encryptedPesticideUsage, buyer);
        FHE.allow(batch.encryptedYield, buyer);

        emit BuyerAuthorized(msg.sender, buyer, batchId);
    }

    /// @notice Authorize a buyer to access all farmer's active batches
    /// @param buyer The buyer address to authorize for all batches
    function authorizeBuyerForAllBatches(address buyer) external {
        require(buyer != address(0), "Invalid buyer address");
        require(!_authorizedBuyers[msg.sender][buyer], "Buyer already authorized");

        uint256[] memory farmerBatches = _batchesOf[msg.sender];
        require(farmerBatches.length > 0, "No batches found for this farmer");

        uint256 authorizedCount = 0;
        uint256 length = farmerBatches.length;

        // Use unchecked for gas optimization in loop
        for (uint256 i = 0; i < length;) {
            uint256 batchId = farmerBatches[i];
            HarvestBatch storage batch = _batches[batchId];

            if (batch.isActive) {
                FHE.allow(batch.encryptedPesticideUsage, buyer);
                FHE.allow(batch.encryptedYield, buyer);
                unchecked { authorizedCount++; }
            }

            unchecked { i++; }
        }

        require(authorizedCount > 0, "No active batches to authorize");
        _authorizedBuyers[msg.sender][buyer] = true;

        emit BuyerAuthorized(msg.sender, buyer, type(uint256).max); // Use max uint for all batches
        emit BulkAuthorizationCompleted(msg.sender, buyer, authorizedCount);
    }

    /// @notice Check if a buyer is authorized to access farmer's batches
    /// @param farmer The farmer address
    /// @param buyer The buyer address
    /// @return authorized Whether buyer is authorized
    function isBuyerAuthorized(address farmer, address buyer) external view returns (bool authorized) {
        return _authorizedBuyers[farmer][buyer];
    }

    /// @notice Get batch count for an owner
    /// @param owner The farmer address
    /// @return count Number of batches
    function getBatchCountByOwner(address owner) external view returns (uint256 count) {
        return _batchesOf[owner].length;
    }

    /// @notice Get batch IDs for an owner
    /// @param owner The farmer address
    /// @return ids Array of batch IDs
    function getBatchIdsByOwner(address owner) external view returns (uint256[] memory ids) {
        return _batchesOf[owner];
    }

    /// @notice Get public metadata for a batch
    /// @param batchId The batch ID
    /// @return owner Owner address
    /// @return cropType Crop type string
    /// @return batchNumber Batch number string
    /// @return farmer Farmer name string
    /// @return date Timestamp (seconds)
    /// @return isActive Whether batch is active
    function getBatchMeta(uint256 batchId)
        external
        view
        returns (
            address owner,
            string memory cropType,
            string memory batchNumber,
            string memory farmer,
            uint64 date,
            bool isActive
        )
    {
        require(batchId < _batches.length, "Batch does not exist");
        HarvestBatch storage batch = _batches[batchId];
        return (batch.owner, batch.cropType, batch.batchNumber, batch.farmer, batch.date, batch.isActive);
    }

    /// @notice Get the encrypted pesticide usage for a batch
    /// @param batchId The batch ID
    /// @return encPesticideUsage The FHE-encrypted pesticide usage
    function getEncryptedPesticideUsage(uint256 batchId) external view returns (euint32 encPesticideUsage) {
        require(batchId < _batches.length, "Batch does not exist");
        return _batches[batchId].encryptedPesticideUsage;
    }

    /// @notice Get the encrypted yield for a batch
    /// @param batchId The batch ID
    /// @return encYield The FHE-encrypted yield
    function getEncryptedYield(uint256 batchId) external view returns (euint32 encYield) {
        require(batchId < _batches.length, "Batch does not exist");
        return _batches[batchId].encryptedYield;
    }

    /// @notice Get total number of batches
    /// @return total Total number of batches
    function getTotalBatchCount() external view returns (uint256 total) {
        return _batches.length;
    }
}
