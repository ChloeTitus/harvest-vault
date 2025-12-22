import { useEffect, useRef } from 'react';
import heroBackground from '@/assets/hero-background.jpg';
import { Shield, Lock, Sparkles } from 'lucide-react';

export const Hero = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = 400;

    const particles: Array<{
      x: number;
      y: number;
      radius: number;
      speedX: number;
      speedY: number;
      opacity: number;
    }> = [];

    // Create particles
    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        radius: Math.random() * 2 + 1,
        speedX: (Math.random() - 0.5) * 0.5,
        speedY: (Math.random() - 0.5) * 0.5,
        opacity: Math.random() * 0.5 + 0.2,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((particle) => {
        particle.x += particle.speedX;
        particle.y += particle.speedY;

        if (particle.x < 0 || particle.x > canvas.width) particle.speedX *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.speedY *= -1;

        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = 400;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="relative h-[400px] overflow-hidden rounded-2xl mb-12 shadow-2xl">
      {/* Animated gradient background */}
      <div className="absolute inset-0 gradient-animated opacity-90" />
      
      {/* Background image overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-30"
        style={{ backgroundImage: `url(${heroBackground})` }}
      />
      
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 opacity-60"
        style={{ mixBlendMode: 'screen' }}
      />

      {/* Animated gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-accent/30 to-secondary/20" />

      {/* Content */}
      <div className="relative h-full flex items-center justify-center text-center px-4 z-10">
        <div className="max-w-4xl animate-fade-in-up">
          <div className="flex justify-center gap-4 mb-6">
            <div className="animate-float" style={{ animationDelay: '0s' }}>
              <Shield className="w-12 h-12 md:w-16 md:h-16 text-white/90 drop-shadow-lg" />
            </div>
            <div className="animate-float" style={{ animationDelay: '0.2s' }}>
              <Lock className="w-12 h-12 md:w-16 md:h-16 text-white/90 drop-shadow-lg" />
            </div>
            <div className="animate-float" style={{ animationDelay: '0.4s' }}>
              <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-white/90 drop-shadow-lg" />
            </div>
          </div>
          
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 drop-shadow-2xl">
            <span className="inline-block animate-fade-in-up text-white" style={{ animationDelay: '0.1s' }}>
              Secure Harvest
            </span>
            <br />
            <span className="inline-block animate-fade-in-up text-white" style={{ animationDelay: '0.3s' }}>
              Management
            </span>
          </h2>
          
          <p className="text-lg md:text-xl lg:text-2xl text-white/95 mb-4 drop-shadow-lg animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
            Track and share your harvest data with
          </p>
          <p className="text-lg md:text-xl lg:text-2xl font-semibold text-white drop-shadow-lg animate-fade-in-up" style={{ animationDelay: '0.7s' }}>
            Blockchain-Powered Encryption
          </p>

          {/* Decorative elements */}
          <div className="absolute top-10 left-10 w-20 h-20 bg-white/10 rounded-full blur-xl animate-pulse-glow" />
          <div className="absolute bottom-10 right-10 w-32 h-32 bg-primary/20 rounded-full blur-2xl animate-pulse" style={{ animationDuration: '3s' }} />
        </div>
      </div>

      {/* Shimmer effect */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none" />
    </div>
  );
};
