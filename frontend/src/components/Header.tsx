import { ConnectButton } from '@rainbow-me/rainbowkit';
import harvestLogo from '@/assets/harvest-logo.svg';
import { Sparkles } from 'lucide-react';

export const Header = () => {
  return (
    <header className="border-b border-primary/20 bg-gradient-to-r from-primary/10 via-background/95 to-accent/10 backdrop-blur-md sticky top-0 z-50 shadow-lg">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1 group">
          <div className="relative">
            <img 
              src={harvestLogo} 
              alt="Harvest Vault Logo" 
              className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-12" 
            />
            <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-primary animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              Encrypted Harvest Vault
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block animate-fade-in-up">
              Fresh Data, Safely Shared.
            </p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          <div className="animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            <ConnectButton
              showBalance={{ smallScreen: false, largeScreen: true }}
              accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
              chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
            />
          </div>
        </div>
      </div>
    </header>
  );
};
