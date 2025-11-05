import heroBackground from '@/assets/hero-background.jpg';

export const Hero = () => {
  return (
    <div className="relative h-64 overflow-hidden rounded-lg mb-8">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary/70" />
      <div className="relative h-full flex items-center justify-center text-center px-4">
        <div className="max-w-2xl">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Secure Harvest Management
          </h2>
          <p className="text-lg text-white/90">
            Track and share your harvest data with blockchain-powered encryption
          </p>
        </div>
      </div>
    </div>
  );
};
