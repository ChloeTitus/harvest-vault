import { useMemo } from "react";
import { useReadContract } from "wagmi";
import { ethers } from "ethers";
import { HarvestVaultABI } from "@/abi/HarvestVaultABI";
import { HarvestVaultAddresses } from "@/abi/HarvestVaultAddresses";
import { useChainId } from "wagmi";

interface BatchMeta {
  owner: string;
  cropType: string;
  batchNumber: string;
  farmer: string;
  date: bigint;
  isActive: boolean;
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
    
    // Debug: log the raw data format
    console.log(`[useBatchData] Batch ${batchId} raw meta:`, metaRaw, 'Type:', typeof metaRaw, 'IsArray:', Array.isArray(metaRaw));
    
    // Handle tuple/array return format
    if (Array.isArray(metaRaw)) {
      const parsed = {
        owner: metaRaw[0] as string,
        cropType: metaRaw[1] as string,
        batchNumber: metaRaw[2] as string,
        farmer: metaRaw[3] as string,
        date: metaRaw[4] as bigint,
        isActive: metaRaw[5] as boolean,
      };
      console.log(`[useBatchData] Batch ${batchId} parsed meta:`, parsed);
      return parsed;
    }
    
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

