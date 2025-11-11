import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Hero } from '@/components/Hero';
import { BatchCard } from '@/components/BatchCard';
import { AddBatchForm } from '@/components/AddBatchForm';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useHarvestVault } from '@/hooks/useHarvestVault';
import { useFHEVMContext } from '@/components/FHEVMProvider';
import { useReadContract } from 'wagmi';
import { HarvestVaultABI } from '@/abi/HarvestVaultABI';
import { HarvestVaultAddresses } from '@/abi/HarvestVaultAddresses';
import { useChainId } from 'wagmi';
import { useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const Index = () => {
  const { address } = useAccount();
  const chainId = useChainId();
  const { instance } = useFHEVMContext();
  const { contractAddress, totalCount, batchIds, createBatch } = useHarvestVault(instance);
  const [refreshKey, setRefreshKey] = useState(0);

  // Get all batch IDs - show all batches to everyone
  const allBatchIds = useMemo(() => {
    if (!contractAddress || !totalCount || totalCount === 0) return [];
    // Generate all batch IDs from 0 to totalCount - 1
    const ids: number[] = [];
    for (let i = 0; i < Number(totalCount); i++) {
      ids.push(i);
    }
    // Sort in descending order (newest first)
    return ids.sort((a, b) => b - a);
  }, [totalCount, contractAddress]);

  const handleBatchCreated = () => {
    // Trigger a refresh by incrementing the key
    setRefreshKey(prev => prev + 1);
  };

  if (!contractAddress) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Hero />
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              Contract not deployed on this network. Please deploy the contract first.
            </p>
            <p className="text-sm text-muted-foreground">
              Run: <code className="bg-muted px-2 py-1 rounded">npx hardhat deploy --network localhost</code>
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8">
        <Hero />

        <Tabs defaultValue="batches" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="batches">View Batches</TabsTrigger>
            <TabsTrigger value="add">Add Batch</TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">Harvest Batches</h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {totalCount > 0
                    ? `Showing all ${totalCount} batch${totalCount === 1 ? '' : 'es'}`
                    : "No batches available yet"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto"
                onClick={() => setRefreshKey(prev => prev + 1)}
              >
                Refresh
              </Button>
            </div>

            {allBatchIds.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">
                  No harvest batches yet. Add your first batch!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allBatchIds.map((batchId) => (
                  <BatchCard
                    key={`${batchId}-${refreshKey}`}
                    batchId={batchId}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add">
            <div className="max-w-3xl mx-auto">
              <AddBatchForm onBatchCreated={handleBatchCreated} />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default Index;