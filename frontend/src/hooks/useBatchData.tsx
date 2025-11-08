import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { ethers } from "ethers";
import { HarvestVaultABI } from "@/abi/HarvestVaultABI";
import { HarvestVaultAddresses } from "@/abi/HarvestVaultAddresses";
import { useChainId } from "wagmi";

interface BatchMeta {
  owner: `0x${string}`;
  cropType: string;
  batchNumber: string;
  farmer: string;
  date: bigint;
  isActive: boolean;
}

// Type guard for batch meta tuple
function isBatchMetaTuple(data: unknown): data is readonly [string, string, string, string, bigint, boolean] {
  return Array.isArray(data) &&
         data.length === 6 &&
         typeof data[0] === 'string' &&
         typeof data[1] === 'string' &&
         typeof data[2] === 'string' &&
         typeof data[3] === 'string' &&
         typeof data[4] === 'bigint' &&
         typeof data[5] === 'boolean';
}

export function useBatchMeta(batchId: number | undefined) {
  const chainId = useChainId();
  
  const contractAddress = useMemo(() => {
    if (!chainId) return undefined;
    const addressEntry = HarvestVaultAddresses[chainId as keyof typeof HarvestVaultAddresses];
    return addressEntry?.address;
  }, [chainId]);

  const { data: metaRaw, isLoading } = useReadContract({
    address: contractAddress,
    abi: HarvestVaultABI,
    functionName: "getBatchMeta",
    args: batchId !== undefined ? [BigInt(batchId)] : undefined,
    query: {
      enabled: !!contractAddress && batchId !== undefined,
    },
  });

  // Parse the tuple return value from the contract
  // getBatchMeta returns: (address owner, string cropType, string batchNumber, string farmer, uint64 date, bool isActive)
  const meta = useMemo(() => {
    if (!metaRaw) return undefined;

    // Use type guard for safer parsing
    if (isBatchMetaTuple(metaRaw)) {
      const [owner, cropType, batchNumber, farmer, date, isActive] = metaRaw;
      return {
        owner: owner as `0x${string}`,
        cropType,
        batchNumber,
        farmer,
        date,
        isActive,
      };
    }

    // Fallback for object format (if wagmi returns it as an object)
    if (typeof metaRaw === 'object' && 'owner' in metaRaw && 'cropType' in metaRaw) {
    
    // Handle object format (if wagmi returns it as an object)
    if (typeof metaRaw === 'object' && 'owner' in metaRaw) {
      console.log(`[useBatchData] Batch ${batchId} object meta:`, metaRaw);
      return metaRaw as BatchMeta;
    }
    
    console.warn(`[useBatchData] Batch ${batchId} unknown meta format:`, metaRaw);
    return undefined;
  }, [metaRaw, batchId]);

  return {
    meta,
    isLoading,
  };
}

export function useEncryptedBatchData(batchId: number | undefined) {
  const chainId = useChainId();
  
  const contractAddress = useMemo(() => {
    if (!chainId) return undefined;
    const addressEntry = HarvestVaultAddresses[chainId as keyof typeof HarvestVaultAddresses];
    return addressEntry?.address;
  }, [chainId]);

  const { data: encryptedPesticideUsage } = useReadContract({
    address: contractAddress,
    abi: HarvestVaultABI,
    functionName: "getEncryptedPesticideUsage",
    args: batchId !== undefined ? [BigInt(batchId)] : undefined,
    query: {
      enabled: !!contractAddress && batchId !== undefined,
    },
  });

  const { data: encryptedYield } = useReadContract({
    address: contractAddress,
    abi: HarvestVaultABI,
    functionName: "getEncryptedYield",
    args: batchId !== undefined ? [BigInt(batchId)] : undefined,
    query: {
      enabled: !!contractAddress && batchId !== undefined,
    },
  });

  return {
    encryptedPesticideUsage: encryptedPesticideUsage as string | undefined,
    encryptedYield: encryptedYield as string | undefined,
  };
}

