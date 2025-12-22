import { useState, useEffect } from 'react';

const cropStatuses = [
  "🌾 Wheat harvest season ongoing",
  "🌽 Corn yields looking strong",
  "🥔 Potato batches ready for market",
  "🍎 Apple orchards producing quality fruit",
  "🥕 Carrot harvest exceeding expectations",
  "🌾 Barley fields showing excellent growth",
];

export const Footer = () => {
  const [currentStatus, setCurrentStatus] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStatus((prev) => (prev + 1) % cropStatuses.length);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="border-t border-primary/20 bg-gradient-to-r from-accent/10 via-background/95 to-primary/10 backdrop-blur-md mt-auto relative overflow-hidden">
      {/* Animated gradient line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent animate-shimmer" />
      
      <div className="container mx-auto px-4 py-6 relative z-10">
        <div className="text-center mb-4">
          <p className="text-sm md:text-base text-muted-foreground transition-all duration-500 animate-fade-in-up font-medium">
            <span className="inline-block animate-pulse mr-2">✨</span>
            {cropStatuses[currentStatus]}
            <span className="inline-block animate-pulse ml-2" style={{ animationDelay: '0.5s' }}>✨</span>
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p className="hover:text-foreground transition-colors duration-300">
            © 2024 Encrypted Harvest. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a 
              href="#" 
              className="hover:text-primary transition-all duration-300 hover:scale-110 relative group"
            >
              Privacy Policy
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#" 
              className="hover:text-primary transition-all duration-300 hover:scale-110 relative group"
            >
              Terms of Service
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
            <a 
              href="#" 
              className="hover:text-primary transition-all duration-300 hover:scale-110 relative group"
            >
              Contact
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-primary group-hover:w-full transition-all duration-300" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};
