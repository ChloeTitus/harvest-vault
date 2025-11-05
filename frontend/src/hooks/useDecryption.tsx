import { useCallback, useRef, useState } from "react";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { toast } from "sonner";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";
import { FhevmDecryptionSignature } from "@/fhevm/FhevmDecryptionSignature";
import { GenericStringInMemoryStorage, type GenericStringStorage } from "@/fhevm/GenericStringStorage";
import { useEthersSigner } from "./useEthersSigner";

// In-memory storage for decryption signatures
const storage = new GenericStringInMemoryStorage();

export function useDecryption(instance: FhevmInstance | undefined, contractAddress: string | undefined) {
  const { address } = useAccount();
  const signerPromise = useEthersSigner();
  const [decrypting, setDecrypting] = useState<Record<string, boolean>>({});

  const decryptValue = useCallback(
    async (encryptedHandle: string, key: string): Promise<bigint | null> => {
      if (!instance || !contractAddress || !address || !signerPromise || !encryptedHandle) {
        toast.error("Missing required data for decryption");
        return null;
      }

      // Check if already decrypting this value
      if (decrypting[key]) {
        return null;
      }

      // Check if handle is zero (uninitialized)
      if (encryptedHandle === ethers.ZeroHash || encryptedHandle === "0x0000000000000000000000000000000000000000000000000000000000000000") {
        return BigInt(0);
      }

      setDecrypting((prev) => ({ ...prev, [key]: true }));

      try {
        toast.info("Decrypting data...");

        // Get ethers signer from promise
        const signer = await signerPromise;
        if (!signer) {
          toast.error("Failed to get signer");
          return null;
        }

        // Load or sign decryption signature
        const sig = await FhevmDecryptionSignature.loadOrSign(
          instance,
          [contractAddress as `0x${string}`],
          signer,
          storage
        );

        if (!sig) {
          toast.error("Unable to build decryption signature");
          return null;
        }

        // Decrypt the value
        const result = await instance.userDecrypt(
          [{ handle: encryptedHandle, contractAddress: contractAddress as `0x${string}` }],
          sig.privateKey,
          sig.publicKey,
          sig.signature,
          sig.contractAddresses,
          sig.userAddress,
          sig.startTimestamp,
          sig.durationDays
        );

        const decryptedValue = result[encryptedHandle];
        toast.success("Decryption successful!");

        setDecrypting((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });

        return typeof decryptedValue === "string" ? BigInt(decryptedValue) : decryptedValue;
      } catch (error: any) {
        console.error("Decryption error:", error);
        toast.error(`Decryption failed: ${error.message}`);
        setDecrypting((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        return null;
      }
    },
    [instance, contractAddress, address, signerPromise, decrypting]
  );

  return {
    decryptValue,
    decrypting,
  };
}

