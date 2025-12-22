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
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <Header />
      
      <main className="flex-1 container mx-auto px-4 py-8 relative z-10">
        <Hero />

        <Tabs defaultValue="batches" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8 glass border-2 border-primary/20 shadow-lg">
            <TabsTrigger 
              value="batches"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 data-[state=active]:shadow-lg"
            >
              View Batches
            </TabsTrigger>
            <TabsTrigger 
              value="add"
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-300 data-[state=active]:shadow-lg"
            >
              Add Batch
            </TabsTrigger>
          </TabsList>

          <TabsContent value="batches" className="space-y-6 animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 glass rounded-lg p-4 border border-primary/20">
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-foreground gradient-text mb-2">
                  Harvest Batches
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground">
                  {totalCount > 0
                    ? `Showing all ${totalCount} batch${totalCount === 1 ? '' : 'es'}`
                    : "No batches available yet"}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full sm:w-auto hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:scale-105"
                onClick={() => setRefreshKey(prev => prev + 1)}
              >
                Refresh
              </Button>
            </div>

            {allBatchIds.length === 0 ? (
              <div className="text-center py-16 animate-fade-in-up">
                <div className="inline-block mb-4 text-6xl animate-float">🌾</div>
                <p className="text-lg text-muted-foreground mb-2">
                  No harvest batches yet.
                </p>
                <p className="text-sm text-muted-foreground">
                  Add your first batch to get started!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allBatchIds.map((batchId, index) => (
                  <div 
                    key={`${batchId}-${refreshKey}`}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <BatchCard batchId={batchId} />
                  </div>
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