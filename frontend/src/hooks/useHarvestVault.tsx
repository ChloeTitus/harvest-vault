import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ethers } from "ethers";
import { toast } from "sonner";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { HarvestVaultABI } from "@/abi/HarvestVaultABI";
import { HarvestVaultAddresses } from "@/abi/HarvestVaultAddresses";

interface BatchMeta {
  owner: string;
  cropType: string;
  batchNumber: string;
  farmer: string;
  date: bigint;
  isActive: boolean;
}

interface HarvestBatch {
  id: number;
  meta: BatchMeta;
  encryptedPesticideUsage?: string;
  encryptedYield?: string;
  decryptedPesticideUsage?: bigint;
  decryptedYield?: bigint;
}

export function useHarvestVault(instance: FhevmInstance | undefined) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Get contract address for current chain
  const contractAddress = useMemo(() => {
    if (!chainId) return undefined;
    const addressEntry = HarvestVaultAddresses[chainId as keyof typeof HarvestVaultAddresses];
    return addressEntry?.address;
  }, [chainId]);

  // Get total batch count
  const { data: totalCount } = useReadContract({
    address: contractAddress,
    abi: HarvestVaultABI,
    functionName: "getTotalBatchCount",
    query: {
      enabled: !!contractAddress,
    },
  });

  // Get batch IDs for current user
  const { data: batchIds } = useReadContract({
    address: contractAddress,
    abi: HarvestVaultABI,
    functionName: "getBatchIdsByOwner",
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: !!contractAddress && !!address,
    },
  }) as { data: bigint[] | undefined };

  // Create batch function
  const createBatch = useCallback(
    async (
      cropType: string,
      batchNumber: string,
      farmer: string,
      pesticideUsage: number,
      yieldAmount: number
    ) => {
      if (!instance || !contractAddress || !address) {
        toast.error("FHEVM instance, contract, or wallet not ready");
        return;
      }

      try {
        toast.info("Encrypting data...");

        // Encrypt pesticide usage (multiply by 100 to store as integer)
        const pesticideValue = Math.round(pesticideUsage * 100);
        const encryptedPesticideInput = instance.createEncryptedInput(contractAddress, address);
        encryptedPesticideInput.add32(pesticideValue);
        const encryptedPesticide = await encryptedPesticideInput.encrypt();

        // Encrypt yield (stored as integer)
        const encryptedYieldInput = instance.createEncryptedInput(contractAddress, address);
        encryptedYieldInput.add32(yieldAmount);
        const encryptedYield = await encryptedYieldInput.encrypt();

        // Helper function to convert Uint8Array to hex string
        const toHexString = (bytes: Uint8Array | string | any): string => {
          if (typeof bytes === 'string') {
            // If it's already a string, ensure it starts with 0x
            return bytes.startsWith('0x') ? bytes : `0x${bytes}`;
          }
          if (bytes instanceof Uint8Array) {
            // Convert Uint8Array to hex string
            return `0x${Array.from(bytes)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('')}`;
          }
          // If it's already a hex string or other format, convert to string
          return String(bytes);
        };

        // Format handles and proofs for wagmi
        const pesticideHandle = toHexString(encryptedPesticide.handles[0]);
        const yieldHandle = toHexString(encryptedYield.handles[0]);
        const pesticideProof = toHexString(encryptedPesticide.inputProof);
        const yieldProof = toHexString(encryptedYield.inputProof);

        console.log("Formatted encryption data:", {
          pesticideHandle: pesticideHandle.slice(0, 20) + "...",
          yieldHandle: yieldHandle.slice(0, 20) + "...",
          pesticideProofLength: pesticideProof.length,
          yieldProofLength: yieldProof.length,
        });

        toast.info("Submitting transaction...");

        // Call contract
        writeContract({
          address: contractAddress,
          abi: HarvestVaultABI,
          functionName: "createBatch",
          args: [
            cropType,
            batchNumber,
            farmer,
            pesticideHandle,
            yieldHandle,
            pesticideProof,
            yieldProof,
          ],
        });
      } catch (error: any) {
        console.error("Create batch error:", error);
        toast.error(`Failed to create batch: ${error.message}`);
      }
    },
    [instance, contractAddress, address, writeContract]
  );

  // Authorize buyer function
  const authorizeBuyer = useCallback(
    async (buyerAddress: string, batchId: number) => {
      if (!contractAddress) {
        toast.error("Contract not deployed");
        return;
      }

      writeContract({
        address: contractAddress,
        abi: HarvestVaultABI,
        functionName: "authorizeBuyer",
        args: [buyerAddress, BigInt(batchId)],
      });
    },
    [contractAddress, writeContract]
  );

  // Transaction status effects
  useEffect(() => {
    if (isPending) {
      toast.info("Transaction pending...");
    }
  }, [isPending]);

  useEffect(() => {
    if (isConfirming) {
      toast.info("Waiting for confirmation...");
    }
  }, [isConfirming]);

  useEffect(() => {
    if (isConfirmed && hash) {
      toast.success("Transaction confirmed!");
    }
  }, [isConfirmed, hash]);

  useEffect(() => {
    if (error) {
      toast.error(`Transaction failed: ${error.message}`);
    }
  }, [error]);

  return {
    contractAddress,
    totalCount: totalCount ? Number(totalCount) : 0,
    batchIds: batchIds ? batchIds.map(id => Number(id)) : [],
    createBatch,
    authorizeBuyer,
    isPending: isPending || isConfirming,
  };
}
