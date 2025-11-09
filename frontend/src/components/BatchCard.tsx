import { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Unlock, Eye, EyeOff, Loader2, UserCheck } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useBatchMeta, useEncryptedBatchData } from '@/hooks/useBatchData';
import { useDecryption } from '@/hooks/useDecryption';
import { useFHEVMContext } from './FHEVMProvider';
import { useHarvestVault } from '@/hooks/useHarvestVault';
import { Input } from '@/components/ui/input';
import { ethers } from 'ethers';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

interface BatchCardProps {
  batchId: number;
}

export const BatchCard = ({ batchId }: BatchCardProps) => {
  const { address } = useAccount();
  const { instance, status: fhevmStatus } = useFHEVMContext();
  const { meta, isLoading: isLoadingMeta } = useBatchMeta(batchId);
  const { encryptedPesticideUsage, encryptedYield } = useEncryptedBatchData(batchId);
  const { authorizeBuyer, isPending: isAuthorizing, contractAddress } = useHarvestVault(instance);
  
  const { decryptValue, decrypting } = useDecryption(instance, contractAddress);
  const [showDecrypted, setShowDecrypted] = useState(false);
  const [decryptedPesticideUsage, setDecryptedPesticideUsage] = useState<bigint | null>(null);
  const [decryptedYield, setDecryptedYield] = useState<bigint | null>(null);
  const [authorizeBuyerAddress, setAuthorizeBuyerAddress] = useState('');
  const [showAuthorizeForm, setShowAuthorizeForm] = useState(false);

  // Check if current user is the owner of this batch
  // Normalize addresses for comparison
  const isOwner = useMemo(() => {
    if (!meta?.owner || !address) return false;
    return meta.owner.toLowerCase().trim() === address.toLowerCase().trim();
  }, [meta?.owner, address]);
  
  // Debug logging (remove in production)
  useEffect(() => {
    if (meta && address) {
      console.log(`[BatchCard ${batchId}] Ownership Check:`, {
        owner: normalizedOwner,
        currentAddress: normalizedAddress,
        isOwner,
        ownerLength: normalizedOwner?.length,
        addressLength: normalizedAddress?.length
      });
    }
  }, [batchId, meta, address, isOwner, normalizedOwner, normalizedAddress]);
  
  const hasEncryptedData = encryptedPesticideUsage && 
                           encryptedPesticideUsage !== ethers.ZeroHash &&
                           encryptedYield &&
                           encryptedYield !== ethers.ZeroHash;

  const handleDecrypt = async () => {
    if (!hasEncryptedData || !encryptedPesticideUsage || !encryptedYield) {
      toast.error('No encrypted data available');
      return;
    }

    const pesticideKey = `pesticide-${batchId}`;
    const yieldKey = `yield-${batchId}`;

    // Decrypt both values
    const pesticide = await decryptValue(encryptedPesticideUsage, pesticideKey);
    const yieldValue = await decryptValue(encryptedYield, yieldKey);

    if (pesticide !== null) {
      setDecryptedPesticideUsage(pesticide);
    }
    if (yieldValue !== null) {
      setDecryptedYield(yieldValue);
    }

    if (pesticide !== null || yieldValue !== null) {
      setShowDecrypted(true);
    }
  };

  const handleAuthorizeBuyer = useCallback(async () => {
    if (!authorizeBuyerAddress || !ethers.isAddress(authorizeBuyerAddress)) {
      toast.error('Please enter a valid Ethereum address');
      return;
    }

    if (authorizeBuyerAddress.toLowerCase() === address?.toLowerCase()) {
      toast.error('Cannot authorize yourself as a buyer');
      return;
    }

    try {
      await authorizeBuyer(authorizeBuyerAddress, batchId);
      setAuthorizeBuyerAddress('');
      setShowAuthorizeForm(false);
      toast.success('Buyer authorized successfully!');
    } catch (error: any) {
      console.error('Authorization error:', error);
      const errorMessage = error.reason || error.message || 'Unknown error occurred';
      if (errorMessage.includes('Only owner can authorize')) {
        toast.error('You are not the owner of this batch');
      } else if (errorMessage.includes('Buyer already authorized')) {
        toast.error('This buyer is already authorized');
      } else if (errorMessage.includes('gas')) {
        toast.error('Transaction failed due to gas issues. Please try again.');
      } else {
        toast.error(`Authorization failed: ${errorMessage}`);
      }
    }
  }, [authorizeBuyerAddress, address, authorizeBuyer, batchId]);

  if (isLoadingMeta) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!meta) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">
          Batch not found
        </CardContent>
      </Card>
    );
  }

  const isDecrypting = decrypting[`pesticide-${batchId}`] || decrypting[`yield-${batchId}`];
  const canDecrypt = fhevmStatus === 'ready' && 
                     hasEncryptedData && 
                     address && 
                     !isDecrypting &&
                     (!showDecrypted || !decryptedPesticideUsage || !decryptedYield);

  return (
    <Card className="hover:shadow-lg transition-all duration-300 border-2 hover:border-primary/50">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              {meta.cropType}
              {hasEncryptedData ? (
                <Lock className="w-4 h-4 text-green-500" />
              ) : (
                <Unlock className="w-4 h-4 text-gray-400" />
              )}
            </CardTitle>
            <CardDescription>Batch #{meta.batchNumber}</CardDescription>
          </div>
          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
            {new Date(Number(meta.date) * 1000).toLocaleDateString()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Farmer:</span>
            <span className="font-medium">{meta.farmer}</span>
          </div>

          {/* Add owner info for debugging - remove this section later */}
          {meta?.owner && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Owner:</span>
              <span className="font-mono">{meta.owner.slice(0, 10)}...{meta.owner.slice(-8)}</span>
            </div>
          )}
          {address && (
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Your Wallet:</span>
              <span className="font-mono">{address.slice(0, 10)}...{address.slice(-8)}</span>
            </div>
          )}
          {isOwner && (
            <div className="text-xs text-green-600 font-semibold">✓ You own this batch</div>
          )}

          {/* Show Authorize Buyer button for owners */}
          {isOwner && (
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAuthorizeForm(!showAuthorizeForm)}
                className="w-full"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                {showAuthorizeForm ? 'Cancel' : 'Authorize Buyer'}
              </Button>
              
              {showAuthorizeForm && (
                <div className="mt-2 space-y-2">
                  <Input
                    placeholder="Buyer address (0x...)"
                    value={authorizeBuyerAddress}
                    onChange={(e) => setAuthorizeBuyerAddress(e.target.value)}
                    disabled={isAuthorizing}
                  />
                  <Button
                    size="sm"
                    onClick={handleAuthorizeBuyer}
                    disabled={!authorizeBuyerAddress || isAuthorizing}
                    className="w-full"
                  >
                    {isAuthorizing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Authorizing...
                      </>
                    ) : (
                      'Authorize'
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Show message if not owner */}
          {!isOwner && address && meta?.owner && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center italic">
                Only the owner can authorize buyers
              </p>
            </div>
          )}

          {/* Show message if wallet not connected */}
          {!address && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground text-center italic">
                Connect wallet to authorize buyers
              </p>
            </div>
          )}

          <div className="border-t pt-3 mt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-muted-foreground">Encrypted Data</span>
              {showDecrypted && (decryptedPesticideUsage !== null || decryptedYield !== null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDecrypted(!showDecrypted)}
                  className="h-6 px-2"
                >
                  {showDecrypted ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </Button>
              )}
            </div>

            {!hasEncryptedData ? (
              <p className="text-xs text-muted-foreground italic">No encrypted data available</p>
            ) : showDecrypted && (decryptedPesticideUsage !== null || decryptedYield !== null) ? (
              <div className="space-y-2 text-sm">
                {decryptedPesticideUsage !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Pesticide Usage:</span>
                    <span className="font-medium">
                      {(Number(decryptedPesticideUsage) / 100).toFixed(2)} kg/hectare
                    </span>
                  </div>
                )}
                {decryptedYield !== null && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Yield:</span>
                    <span className="font-medium">
                      {Number(decryptedYield).toLocaleString()} kg
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <div className="bg-muted/50 p-2 rounded font-mono text-xs truncate">
                  {encryptedPesticideUsage?.slice(0, 20)}...
                </div>
                <div className="bg-muted/50 p-2 rounded font-mono text-xs truncate">
                  {encryptedYield?.slice(0, 20)}...
                </div>
                <p className="text-xs text-muted-foreground italic">
                  Data encrypted on-chain. Click decrypt to view.
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
      
      {hasEncryptedData && (
        <CardFooter>
          <Button
            onClick={handleDecrypt}
            disabled={!canDecrypt || isDecrypting}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isDecrypting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Decrypting...
              </>
            ) : !address ? (
              'Connect Wallet to Decrypt'
            ) : fhevmStatus !== 'ready' ? (
              'Initializing Encryption...'
            ) : (
              <>
                <Unlock className="w-4 h-4 mr-2" />
                {showDecrypted && decryptedPesticideUsage && decryptedYield ? 'Data Decrypted' : 'Decrypt Data'}
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};