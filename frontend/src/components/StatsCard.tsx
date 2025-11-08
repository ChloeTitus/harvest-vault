import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart3, Users, Package, TrendingUp } from 'lucide-react';

interface StatsCardProps {
  totalBatches: number;
  totalFarmers: number;
  totalBuyers: number;
  isLoading?: boolean;
}

export const StatsCard = ({ totalBatches, totalFarmers, totalBuyers, isLoading }: StatsCardProps) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Platform Statistics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="animate-pulse h-8 bg-gray-200 rounded mb-2"></div>
              <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="animate-pulse h-8 bg-gray-200 rounded mb-2"></div>
              <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="animate-pulse h-8 bg-gray-200 rounded mb-2"></div>
              <div className="animate-pulse h-4 bg-gray-200 rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Platform Statistics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Package className="w-5 h-5 text-blue-500" />
              <span className="text-2xl font-bold">{totalBatches}</span>
            </div>
            <p className="text-sm text-muted-foreground">Total Batches</p>
            <Badge variant="secondary" className="mt-2">Active</Badge>
          </div>

          <div className="text-center p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Users className="w-5 h-5 text-green-500" />
              <span className="text-2xl font-bold">{totalFarmers}</span>
            </div>
            <p className="text-sm text-muted-foreground">Registered Farmers</p>
            <Badge variant="secondary" className="mt-2">Growing</Badge>
          </div>

          <div className="text-center p-4 border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex items-center justify-center gap-2 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-500" />
              <span className="text-2xl font-bold">{totalBuyers}</span>
            </div>
            <p className="text-sm text-muted-foreground">Active Buyers</p>
            <Badge variant="secondary" className="mt-2">Trading</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
