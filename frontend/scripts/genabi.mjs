import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const CONTRACT_NAME = 'HarvestVault';

// Root hardhat project (one level up from frontend)
const rootDir = resolve('..');
const deploymentsDir = join(rootDir, 'deployments');

// Output directory
const outDir = resolve('./src/abi');
const abiFile = join(outDir, 'HarvestVaultABI.ts');
const addressesFile = join(outDir, 'HarvestVaultAddresses.ts');

// Ensure output directory exists
if (!existsSync(outDir)) {
  import('fs').then(({ mkdirSync }) => {
    mkdirSync(outDir, { recursive: true });
  });
}

function readDeployment(chainName) {
  const chainDeploymentDir = join(deploymentsDir, chainName);
  
  if (!existsSync(chainDeploymentDir)) {
    console.warn(`⚠️  Deployment directory not found: ${chainDeploymentDir}`);
    return null;
  }

  const jsonFile = join(chainDeploymentDir, `${CONTRACT_NAME}.json`);
  if (!existsSync(jsonFile)) {
    console.warn(`⚠️  Deployment file not found: ${jsonFile}`);
    return null;
  }

  try {
    const content = readFileSync(jsonFile, 'utf-8');
    const deployment = JSON.parse(content);
    return {
      address: deployment.address,
      abi: deployment.abi,
      chainName,
      chainId: chainName === 'localhost' ? 31337 : chainName === 'sepolia' ? 11155111 : null,
    };
  } catch (error) {
    console.error(`❌ Error reading deployment: ${error.message}`);
    return null;
  }
}

// Read deployments
const localhostDeploy = readDeployment('localhost');
const sepoliaDeploy = readDeployment('sepolia');

// Generate ABI file
const abiCode = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
  Last updated: ${new Date().toISOString()}
*/

export const HarvestVaultABI = ${JSON.stringify(
  (localhostDeploy || sepoliaDeploy)?.abi || [],
  null,
  2
)} as const;
`;

writeFileSync(abiFile, abiCode, 'utf-8');
console.log(`✅ Generated ABI: ${abiFile}`);

// Generate addresses file
const addressesCode = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
  Last updated: ${new Date().toISOString()}
*/

export const HarvestVaultAddresses = {
  ${localhostDeploy ? `${localhostDeploy.chainId}: {
    address: "${localhostDeploy.address}" as \`0x\${string}\`,
    chainId: ${localhostDeploy.chainId},
    chainName: "localhost",
  },` : ''}
  ${sepoliaDeploy ? `${sepoliaDeploy.chainId}: {
    address: "${sepoliaDeploy.address}" as \`0x\${string}\`,
    chainId: ${sepoliaDeploy.chainId},
    chainName: "sepolia",
  },` : ''}
} as const;
`;

writeFileSync(addressesFile, addressesCode, 'utf-8');
console.log(`✅ Generated addresses: ${addressesFile}`);

if (localhostDeploy) {
  console.log(`\n📋 Localhost deployment: ${localhostDeploy.address}`);
}
if (sepoliaDeploy) {
  console.log(`📋 Sepolia deployment: ${sepoliaDeploy.address}`);
}

if (!localhostDeploy && !sepoliaDeploy) {
  console.warn('\n⚠️  No deployments found. Please deploy the contract first:');
  console.warn('   npx hardhat deploy --network localhost');
}

