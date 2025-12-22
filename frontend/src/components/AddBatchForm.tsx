import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Loader2 } from 'lucide-react';
import { useFHEVMContext } from './FHEVMProvider';
import { useHarvestVault } from '@/hooks/useHarvestVault';
import { useAccount } from 'wagmi';

interface AddBatchFormProps {
  onBatchCreated?: () => void;
}

export const AddBatchForm = ({ onBatchCreated }: AddBatchFormProps) => {
  const { instance, status: fhevmStatus } = useFHEVMContext();
  const { address } = useAccount();
  const { createBatch, isPending } = useHarvestVault(instance);

  const [formData, setFormData] = useState({
    cropType: '',
    batchNumber: '',
    farmer: '',
    pesticideUsage: '',
    yield: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cropType || !formData.batchNumber || !formData.farmer || !formData.pesticideUsage || !formData.yield) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.cropType.trim().length < 2) {
      toast.error('Crop type must be at least 2 characters long');
      return;
    }

    if (formData.farmer.trim().length < 2) {
      toast.error('Farmer name must be at least 2 characters long');
      return;
    }

    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (fhevmStatus !== 'ready' || !instance) {
      toast.error('FHEVM is not ready. Please wait...');
      return;
    }

    const pesticideUsage = parseFloat(formData.pesticideUsage);
    const yieldAmount = parseFloat(formData.yield);

    if (isNaN(pesticideUsage) || pesticideUsage < 0) {
      toast.error('Pesticide usage must be a valid positive number');
      return;
    }

    if (isNaN(yieldAmount) || yieldAmount < 0) {
      toast.error('Yield must be a valid positive number');
      return;
    }

    try {
      await createBatch(
        formData.cropType,
        formData.batchNumber,
        formData.farmer,
        pesticideUsage,
        Math.round(yieldAmount)
      );

      toast.success('Batch created successfully!');
      
      // Reset form
      setFormData({
        cropType: '',
        batchNumber: '',
        farmer: '',
        pesticideUsage: '',
        yield: '',
      });

      if (onBatchCreated) {
        onBatchCreated();
      }
    } catch (error: any) {
      console.error('Create batch error:', error);
      toast.error(`Failed to create batch: ${error.message}`);
    }
  };

  const isLoading = fhevmStatus === 'loading' || isPending;

  return (
    <Card className="border-2 border-primary/20 glass shadow-xl hover:shadow-2xl transition-all duration-500 animate-fade-in-up relative overflow-hidden group" role="region" aria-labelledby="batch-form-title">
      {/* Animated gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-accent/0 to-secondary/0 group-hover:from-primary/5 group-hover:via-accent/3 group-hover:to-secondary/5 transition-all duration-500" />
      
      <CardHeader className="relative z-10">
        <CardTitle id="batch-form-title" className="flex items-center gap-2 text-2xl gradient-text">
          <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" aria-hidden="true" />
          Add New Harvest Batch
        </CardTitle>
        <CardDescription className="text-base mt-2">
          Log your harvest data with FHE encryption. All sensitive data will be encrypted before being stored on-chain.
        </CardDescription>
      </CardHeader>
      <CardContent className="relative z-10">
        <form onSubmit={handleSubmit} className="space-y-4" role="form" aria-label="Create harvest batch form">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cropType">Crop Type *</Label>
              <Select
                value={formData.cropType}
                onValueChange={(value) => setFormData({ ...formData, cropType: value })}
                disabled={isLoading}
                aria-describedby="cropType-help"
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select crop type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Wheat">🌾 Wheat</SelectItem>
                  <SelectItem value="Corn">🌽 Corn</SelectItem>
                  <SelectItem value="Potato">🥔 Potato</SelectItem>
                  <SelectItem value="Apple">🍎 Apple</SelectItem>
                  <SelectItem value="Carrot">🥕 Carrot</SelectItem>
                  <SelectItem value="Barley">🌾 Barley</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="batchNumber">Batch Number *</Label>
              <Input
                id="batchNumber"
                placeholder="e.g., 2024-001"
                value={formData.batchNumber}
                onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="farmer">Farmer Name *</Label>
              <Input
                id="farmer"
                placeholder="e.g., John Smith"
                value={formData.farmer}
                onChange={(e) => setFormData({ ...formData, farmer: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pesticideUsage">Pesticide Usage (kg/hectare) *</Label>
              <Input
                id="pesticideUsage"
                type="number"
                step="0.01"
                min="0"
                placeholder="e.g., 2.5"
                value={formData.pesticideUsage}
                onChange={(e) => setFormData({ ...formData, pesticideUsage: e.target.value })}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="yield">Yield Amount (kg) *</Label>
              <Input
                id="yield"
                type="number"
                step="1"
                min="0"
                placeholder="e.g., 4500"
                value={formData.yield}
                onChange={(e) => setFormData({ ...formData, yield: e.target.value })}
                disabled={isLoading}
              />
            </div>
          </div>

          {fhevmStatus === 'error' && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-500">
              FHEVM initialization error. Please refresh the page.
            </div>
          )}

          {fhevmStatus === 'loading' && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm text-blue-500">
              Initializing encryption service...
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 relative overflow-hidden group/btn" 
            disabled={isLoading || fhevmStatus !== 'ready' || !address}
          >
            {/* Shimmer effect */}
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
            
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {isPending ? 'Creating Batch...' : 'Initializing...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2 group-hover/btn:rotate-90 transition-transform duration-300" />
                Add Encrypted Batch
              </>
            )}
          </Button>

          {!address && (
            <p className="text-xs text-center text-muted-foreground">
              Please connect your wallet to create a batch
            </p>
          )}
        </form>
      </CardContent>
    </Card>
  );
};