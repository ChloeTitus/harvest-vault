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
    <footer className="border-t border-border bg-card/80 backdrop-blur-sm mt-auto">
      <div className="container mx-auto px-4 py-6">
        <div className="text-center mb-4">
          <p className="text-sm text-muted-foreground transition-all duration-500 animate-in fade-in">
            {cropStatuses[currentStatus]}
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 Encrypted Harvest. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-primary transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-primary transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
};
