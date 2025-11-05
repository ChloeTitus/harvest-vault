import { ConnectButton } from '@rainbow-me/rainbowkit';
import harvestLogo from '@/assets/harvest-logo.svg';

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={harvestLogo} alt="Harvest Vault Logo" className="w-10 h-10" />
          <div>
            <h1 className="text-xl font-bold text-foreground">Encrypted Harvest Vault</h1>
            <p className="text-sm text-muted-foreground">Fresh Data, Safely Shared.</p>
          </div>
        </div>
        <ConnectButton 
          showBalance={{ smallScreen: false, largeScreen: true }}
          accountStatus={{ smallScreen: "avatar", largeScreen: "full" }}
          chainStatus={{ smallScreen: "icon", largeScreen: "full" }}
        />
      </div>
    </header>
  );
};
