import { ConnectButton } from '@rainbow-me/rainbowkit';
import harvestLogo from '@/assets/harvest-logo.svg';

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <img src={harvestLogo} alt="Harvest Vault Logo" className="w-8 h-8 sm:w-10 sm:h-10 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-bold text-foreground truncate">Encrypted Harvest Vault</h1>
            <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Fresh Data, Safely Shared.</p>
          </div>
        </div>
        <div className="flex-shrink-0 ml-4">
          <ConnectButton
            showBalance={{ smallScreen: false, largeScreen: true }}
            accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
            chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
          />
        </div>
      </div>
    </header>
  );
};
