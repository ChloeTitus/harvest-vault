import { createContext, useContext, ReactNode } from "react";
import { useAccount, useChainId, useWalletClient } from "wagmi";
import { useFhevm } from "@/fhevm/useFhevm";
import type { FhevmInstance } from "@/fhevm/fhevmTypes";

interface FHEVMContextType {
  instance: FhevmInstance | undefined;
  status: "idle" | "loading" | "ready" | "error";
  error: Error | undefined;
}

const FHEVMContext = createContext<FHEVMContextType | undefined>(undefined);

export function FHEVMProvider({ children }: { children: ReactNode }) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();

  const provider = walletClient ? (walletClient as any) : undefined;

  const { instance, status, error } = useFhevm({
    provider,
    chainId,
    enabled: !!provider && !!chainId,
    initialMockChains: { 31337: "http://127.0.0.1:8545" },
  });

  return (
    <FHEVMContext.Provider value={{ instance, status, error }}>
      {children}
    </FHEVMContext.Provider>
  );
}

export function useFHEVMContext() {
  const context = useContext(FHEVMContext);
  if (context === undefined) {
    throw new Error("useFHEVMContext must be used within FHEVMProvider");
  }
  return context;
}

