# Encrypted Harvest Vault

> **"Fresh Data, Safely Shared"**

A privacy-preserving agricultural data management system built on blockchain using **Fully Homomorphic Encryption (FHE)** via FHEVM. Farmers can securely store encrypted harvest data (pesticide usage and yield) on-chain, and authorize specific buyers to decrypt and view sensitive information while data remains encrypted on the blockchain at all times.

## 🌐 Live Demo

- **🌍 Vercel Deployment**: [https://encrypted-harvest-vault.vercel.app/](https://encrypted-harvest-vault.vercel.app/)
- **📹 Demo Video**: [encrypted-harvest-vault.mp4](https://github.com/ChloeTitus/harvest-vault/blob/main/encrypted-harvest-vault.mp4)
- **📦 GitHub Repository**: [https://github.com/ChloeTitus/harvest-vault](https://github.com/ChloeTitus/harvest-vault)

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Core Features](#core-features)
- [MVP Core Flow](#mvp-core-flow)
- [Smart Contract Addresses](#smart-contract-addresses)
- [Encryption & Decryption Logic](#encryption--decryption-logic)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Smart Contract Code](#smart-contract-code)
- [Testing](#testing)
- [Deployment](#deployment)
- [Project Structure](#project-structure)

## 🎯 Project Overview

This project implements a blockchain-based agricultural data management system that enables:

- **Privacy-Preserving Data Storage**: Sensitive agricultural data (pesticide usage and yield) is encrypted using FHE before being stored on-chain
- **Selective Access Control**: Farmers can authorize specific buyers to access their encrypted batch data
- **Transparent Metadata**: Public information (crop type, batch number, farmer name, date) is stored in plaintext for discovery
- **Real-Time Decryption**: Authorized buyers decrypt encrypted data in their browser using FHEVM without exposing data on-chain

### Core Features

1. **🔐 FHE Encryption**: Pesticide usage and yield are encrypted using FHEVM before being stored on-chain
2. **👥 Authorization System**: Farmers can authorize specific buyers to access their batch data via ACL (Access Control List)
3. **🔒 Privacy-Preserving**: All sensitive data remains encrypted on-chain at all times
4. **📊 On-Chain Storage**: All data is stored on the blockchain for transparency and immutability
5. **🌐 Public Batch Discovery**: All batches are visible to everyone, but only authorized users can decrypt sensitive data

## 🚀 MVP Core Flow (5 Steps)

1. **Farmer** → Frontend FHE encrypts (pesticide usage & yield) → Stores on-chain (HarvestVault contract)
2. **Farmer** authorizes specific buyers
3. **Buyer** connects wallet → Frontend FHE decrypts → Views real data
4. Data remains encrypted on-chain at all times
5. Decryption happens only in authorized buyer's browser

### Detailed User Journey

```
Farmer Flow:
1. Connect wallet (MetaMask/RainbowKit)
2. Fill harvest batch form (Crop Type, Batch Number, Farmer Name, Pesticide Usage, Yield)
3. Frontend encrypts sensitive data using FHEVM
4. Submit transaction to create batch on-chain
5. Authorize buyers by entering their wallet addresses

Buyer Flow:
1. Connect wallet
2. Browse all harvest batches
3. Click "Decrypt Data" on authorized batches
4. Sign EIP-712 decryption request
5. View decrypted pesticide usage and yield in browser
```

## 📍 Smart Contract Addresses

### Local Network (Hardhat)
- **Network**: Localhost (Chain ID: 31337)
- **RPC URL**: `http://127.0.0.1:8545`
- **Contract Address**: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
- **Explorer**: N/A (Local network)

### Sepolia Testnet
- **Network**: Sepolia (Chain ID: 11155111)
- **RPC URL**: `https://sepolia.infura.io/v3/YOUR_INFURA_KEY`
- **Contract Address**: `0x207888Ba4A0b7f58a05D444c84bcd2170c62b8C7`
- **Explorer**: [https://sepolia.etherscan.io/address/0x207888Ba4A0b7f58a05D444c84bcd2170c62b8C7](https://sepolia.etherscan.io/address/0x207888Ba4A0b7f58a05D444c84bcd2170c62b8C7)

### Contract Addresses Configuration

The contract addresses are automatically configured in:
- **File**: `frontend/src/abi/HarvestVaultAddresses.ts`
- **Auto-generated**: Run `npm run genabi` in the frontend directory after deployment

## 🔐 Encryption & Decryption Logic

### Data Encryption Flow (Frontend → Blockchain)

**Encrypted Fields:**
- **Pesticide Usage**: `uint32` (stored as `kg/hectare * 100` to preserve decimals)
- **Yield**: `uint32` (stored as `kg`)

**Encryption Process:**

```typescript
// 1. Prepare values for encryption
const pesticideValue = Math.round(pesticideUsage * 100); // e.g., 2.5 → 250
const yieldValue = yieldAmount; // e.g., 4500

// 2. Create encrypted input for pesticide usage
const encryptedPesticideInput = fhevmInstance.createEncryptedInput(
  contractAddress, 
  userAddress
);
encryptedPesticideInput.add32(pesticideValue);
const encryptedPesticide = await encryptedPesticideInput.encrypt();

// 3. Create encrypted input for yield
const encryptedYieldInput = fhevmInstance.createEncryptedInput(
  contractAddress, 
  userAddress
);
encryptedYieldInput.add32(yieldValue);
const encryptedYield = await encryptedYieldInput.encrypt();

// 4. Submit to contract with handles and proofs
contract.createBatch(
  cropType,
  batchNumber,
  farmer,
  encryptedPesticide.handles[0],    // Encrypted handle
  encryptedYield.handles[0],         // Encrypted handle
  encryptedPesticide.inputProof,     // ZK proof
  encryptedYield.inputProof          // ZK proof
);
```

**On-Chain Storage:**
- Contract receives `externalEuint32` handles and `bytes` proofs
- Validates proofs using `FHE.fromExternal()` 
- Stores as `euint32` (encrypted uint32) in contract state
- Sets ACL permissions: `FHE.allow()` for owner and contract

### Data Decryption Flow (Blockchain → Browser)

**Decryption Process:**

```typescript
// 1. Get encrypted handle from contract
const encryptedHandle = await contract.getEncryptedPesticideUsage(batchId);

// 2. Generate keypair for user decryption
const keypair = fhevmInstance.generateKeypair();

// 3. Create EIP-712 signature request
const eip712 = fhevmInstance.createEIP712(
  keypair.publicKey,
  [contractAddress],
  startTimestamp,
  durationDays
);

// 4. Sign the decryption request
const signature = await signer.signTypedData(
  eip712.domain,
  { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
  eip712.message
);

// 5. Request decryption from FHEVM relayer
const result = await fhevmInstance.userDecrypt(
  [{ handle: encryptedHandle, contractAddress }],
  keypair.privateKey,
  keypair.publicKey,
  signature.replace("0x", ""),
  [contractAddress],
  userAddress,
  startTimestamp,
  durationDays
);

// 6. Extract decrypted value
const decryptedValue = result[encryptedHandle]; // Returns BigInt

// 7. Format for display
const pesticideUsage = Number(decryptedValue) / 100; // e.g., 250 → 2.5 kg/hectare
const yield = Number(decryptedValue); // e.g., 4500 kg
```

**Decryption Security:**
- Requires EIP-712 signature from authorized user
- Relayer verifies signature and ACL permissions
- Decryption happens in browser, never on-chain
- Original encrypted data remains unchanged on blockchain

### Authorization Flow (ACL)

```solidity
// 1. Farmer authorizes buyer
function authorizeBuyer(address buyer, uint256 batchId) external {
    require(batch.owner == msg.sender, "Only owner can authorize");
    
    // Grant buyer access to encrypted data
    FHE.allow(batch.encryptedPesticideUsage, buyer);
    FHE.allow(batch.encryptedYield, buyer);
}
```

```typescript
// Frontend: Farmer authorizes buyer
await contract.authorizeBuyer(buyerAddress, batchId);
```

**Access Control:**
- Only batch owner can authorize buyers
- Buyer receives ACL permission for specific batch's encrypted fields
- Permission persists until explicitly revoked (via contract upgrade)

## 🛠 Technology Stack

### Smart Contracts
- **Solidity** ^0.8.27
- **FHEVM** (@fhevm/solidity) - Zama's FHE Solidity library
- **Hardhat** - Development environment
- **hardhat-deploy** - Deployment management
- **TypeChain** - TypeScript bindings generation

### Frontend
- **React** ^18.3.1 - UI framework
- **TypeScript** ^5.8.3 - Type safety
- **Vite** ^5.4.19 - Build tool
- **Wagmi** ^2.19.4 - Ethereum React Hooks
- **RainbowKit** ^2.2.9 - Wallet connection UI
- **FHEVM SDK** (@zama-fhe/relayer-sdk ^0.2.0) - FHE encryption/decryption
- **Ethers.js** ^6.15.0 - Ethereum library
- **shadcn-ui** + **Tailwind CSS** - UI components and styling
- **React Router** ^6.30.1 - Routing

### Infrastructure
- **Vercel** - Frontend hosting
- **Sepolia Testnet** - Ethereum test network
- **Infura** - RPC provider

## 📦 Getting Started

### Prerequisites

- **Node.js** >= 20
- **npm** >= 7.0.0
- **MetaMask** or compatible Web3 wallet
- **Git** for cloning the repository

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/ChloeTitus/harvest-vault.git
cd harvest-vault
```

2. **Install backend dependencies:**
```bash
npm install
```

3. **Install frontend dependencies:**
```bash
cd frontend
npm install
cd ..
```

### Local Development

#### 1. Start Local Blockchain Node

Open a terminal and start Hardhat node:

```bash
npx hardhat node
```

This will:
- Start a local Ethereum node on `http://127.0.0.1:8545`
- Generate 20 test accounts with 10,000 ETH each
- Display private keys for importing into MetaMask

#### 2. Deploy Contract to Local Network

Open a second terminal:

```bash
npx hardhat --network localhost deploy
```

After deployment, the contract address will be displayed. The frontend is pre-configured to use the default Hardhat address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`

#### 3. Configure MetaMask

- **Network Name**: Hardhat Local
- **RPC URL**: `http://127.0.0.1:8545`
- **Chain ID**: `31337`
- **Currency Symbol**: `ETH`

Import a test account using one of the private keys from the Hardhat node output.

#### 4. Start Frontend Development Server

Open a third terminal:

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:8080`

#### 5. Run Tests

```bash
npm test
```

## 📜 Smart Contract Code

### Contract: HarvestVault.sol

Location: `contracts/HarvestVault.sol`

**Key Data Structures:**

```solidity
struct HarvestBatch {
    address owner;                    // Farmer address
    string cropType;                  // Plaintext: e.g., "Wheat", "Corn"
    string batchNumber;               // Plaintext: e.g., "2024-001"
    string farmer;                    // Plaintext: Farmer name
    uint64 date;                      // Plaintext: Timestamp
    euint32 encryptedPesticideUsage;  // FHE-encrypted pesticide usage (kg/hectare * 100)
    euint32 encryptedYield;           // FHE-encrypted yield (kg)
    bool isActive;                    // Whether batch is active
}
```

**Core Functions:**

1. **`createBatch()`** - Create a new harvest batch with encrypted data
   - Accepts: `cropType`, `batchNumber`, `farmer`, `encPesticideUsage`, `encYield`, `pesticideProof`, `yieldProof`
   - Validates proofs and converts external encrypted inputs to internal encrypted values
   - Sets ACL permissions for owner
   - Emits `BatchCreated` event

2. **`authorizeBuyer()`** - Authorize a buyer to access batch data
   - Requires: Batch owner
   - Grants buyer ACL permission for encrypted fields
   - Emits `BuyerAuthorized` event

3. **`getBatchMeta()`** - Get public metadata (plaintext)
   - Returns: `owner`, `cropType`, `batchNumber`, `farmer`, `date`, `isActive`

4. **`getEncryptedPesticideUsage()`** - Get encrypted pesticide usage handle
   - Returns: `euint32` encrypted handle (for decryption in browser)

5. **`getEncryptedYield()`** - Get encrypted yield handle
   - Returns: `euint32` encrypted handle (for decryption in browser)

6. **`isBuyerAuthorized()`** - Check authorization status
   - Returns: `bool` indicating if buyer is authorized

See full contract code: `contracts/HarvestVault.sol`

## 🧪 Testing

### Local Tests

```bash
npm test
```

Tests cover:
- Batch creation with encrypted data
- Authorization system
- Metadata retrieval
- Encrypted data retrieval

### Sepolia Testnet Tests

```bash
npm run test:sepolia
```

**Note**: Requires Sepolia ETH for gas fees. Get testnet ETH from [Sepolia Faucet](https://sepoliafaucet.com/)

## 🚀 Deployment

### Contract Deployment

#### Local Network
```bash
npx hardhat --network localhost deploy
```

#### Sepolia Testnet

**Option 1: Using Environment Variables (Recommended)**

```bash
# Set environment variables (do not commit to git)
$env:DEPLOYER_PRIVATE_KEY="0x...your_private_key..."
$env:INFURA_API_KEY="your_infura_api_key"

# Deploy
npx hardhat --network sepolia deploy
```

**Option 2: Using Hardhat Variables**

```bash
npx hardhat vars set INFURA_API_KEY
npx hardhat vars set DEPLOYER_PRIVATE_KEY
npx hardhat --network sepolia deploy
```

After deployment, update `frontend/src/abi/HarvestVaultAddresses.ts` with the new contract address, or run:

```bash
cd frontend
npm run genabi
```

### Frontend Deployment (Vercel)

1. **Connect GitHub repository** to Vercel
2. **Set Root Directory** to `frontend` in Vercel project settings
3. **Configure Environment Variables** (if needed):
   - `VITE_WALLETCONNECT_PROJECT_ID` (optional, for WalletConnect)

4. **Deploy automatically** on push to main branch

Or manually deploy:

```bash
cd frontend
npm run build
vercel --prod
```

**Vercel Configuration**: See `vercel.json` in project root

## 📁 Project Structure

```
encrypted-harvest-vault/
├── contracts/
│   └── HarvestVault.sol              # Main smart contract with FHE encryption
├── deploy/
│   └── deploy.ts                     # Hardhat deployment script
├── test/
│   ├── HarvestVault.ts              # Local network tests
│   └── HarvestVaultSepolia.ts       # Sepolia testnet tests
├── tasks/
│   ├── accounts.ts                  # Account management tasks
│   └── HarvestVault.ts              # Contract interaction tasks
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddBatchForm.tsx     # Form for creating batches
│   │   │   ├── BatchCard.tsx        # Display batch cards with decrypt
│   │   │   ├── FHEVMProvider.tsx    # FHEVM instance provider
│   │   │   ├── Header.tsx           # Header with wallet connection
│   │   │   └── ui/                  # shadcn-ui components
│   │   ├── hooks/
│   │   │   ├── useHarvestVault.tsx  # Contract interaction hook
│   │   │   ├── useDecryption.tsx    # FHE decryption hook
│   │   │   ├── useBatchData.tsx     # Batch data fetching hook
│   │   │   └── useEthersSigner.ts   # Ethers signer adapter
│   │   ├── fhevm/
│   │   │   ├── internal/            # FHEVM internal files
│   │   │   ├── FhevmDecryptionSignature.ts
│   │   │   ├── GenericStringStorage.ts
│   │   │   └── useFhevm.tsx
│   │   ├── abi/
│   │   │   ├── HarvestVaultABI.ts   # Auto-generated ABI
│   │   │   └── HarvestVaultAddresses.ts  # Contract addresses
│   │   ├── config/
│   │   │   └── wagmi.ts             # Wagmi/RainbowKit config
│   │   └── pages/
│   │       └── Index.tsx            # Main page
│   ├── package.json
│   └── vite.config.ts
├── hardhat.config.ts                 # Hardhat configuration
├── vercel.json                       # Vercel deployment config
└── README.md                         # This file
```

## 🔑 Key Implementation Details

### Data Format

**Encrypted Values:**
- **Pesticide Usage**: Stored as `uint32` where value = `kg/hectare * 100`
  - Example: `2.5 kg/hectare` → stored as `250`
  - Display: `decryptedValue / 100`

- **Yield**: Stored as `uint32` in `kg`
  - Example: `4500 kg` → stored as `4500`
  - Display: `decryptedValue`

**Public Metadata:**
- `cropType`: String (e.g., "Wheat", "Corn")
- `batchNumber`: String (e.g., "2024-001")
- `farmer`: String (Farmer name)
- `date`: uint64 (Unix timestamp)
- `owner`: address (Farmer wallet address)

### ACL (Access Control List)

The contract uses FHEVM's ACL system to control who can decrypt data:

1. **On Batch Creation:**
   ```solidity
   FHE.allowThis(batch.encryptedPesticideUsage);  // Contract can access
   FHE.allow(batch.encryptedPesticideUsage, owner); // Owner can access
   ```

2. **On Buyer Authorization:**
   ```solidity
   FHE.allow(batch.encryptedPesticideUsage, buyer); // Buyer can now decrypt
   ```

### Security Considerations

- ✅ **Encrypted on-chain**: Sensitive data never exists in plaintext on blockchain
- ✅ **Browser-only decryption**: Decryption happens in user's browser, not on-chain
- ✅ **EIP-712 signatures**: Decryption requires cryptographic signature
- ✅ **ACL-based authorization**: Only authorized users can decrypt
- ✅ **Immutable storage**: Once stored, data cannot be modified
- ⚠️ **Private key security**: Users must protect their wallet private keys
- ⚠️ **Relayer dependency**: Decryption requires FHEVM relayer service (testnet: `relayer.testnet.zama.cloud`)

## 📝 Usage Examples

### Creating a Batch (Farmer)

```typescript
// 1. Connect wallet
await connectWallet();

// 2. Fill form and submit
await createBatch(
  "Wheat",           // cropType
  "2024-001",        // batchNumber
  "John Smith",      // farmer
  2.5,               // pesticideUsage (kg/hectare)
  4500               // yield (kg)
);

// 3. Authorize buyer
await authorizeBuyer("0x...buyerAddress...", batchId);
```

### Viewing and Decrypting (Buyer)

```typescript
// 1. Connect wallet
await connectWallet();

// 2. Browse batches (all batches visible)
const batches = await getTotalBatchCount();

// 3. Decrypt authorized batch
await decryptValue(encryptedHandle, "pesticide-0");
// Displays: 2.50 kg/hectare
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

MIT

## 🙏 Acknowledgments

- **FHEVM by Zama** - Fully Homomorphic Encryption on Ethereum
- **Hardhat FHE Template** - Development template and tooling
- **RainbowKit & Wagmi** - Wallet connection and Web3 React hooks
- **shadcn-ui** - Beautiful UI component library

**Built with ❤️ using FHEVM and Web3 technologies**
