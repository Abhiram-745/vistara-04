import confetti from 'canvas-confetti';

export const triggerConfetti = (type: 'success' | 'achievement' | 'milestone' | 'complete') => {
  const colors = ['#22d3ee', '#8b5cf6', '#f59e0b', '#10b981', '#ec4899'];
  
  switch (type) {
    case 'success':
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: colors,
      });
      break;
      
    case 'achievement':
      // Fireworks effect
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999, colors };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: Math.random() * 0.4 + 0.1, y: Math.random() - 0.2 },
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: Math.random() * 0.4 + 0.5, y: Math.random() - 0.2 },
        });
      }, 250);
      break;
      
    case 'milestone':
      // Side cannons
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: colors,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: colors,
      });
      break;
      
    case 'complete':
      // Burst from center
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.5, x: 0.5 },
        colors: colors,
        startVelocity: 45,
      });
      break;
  }
};

export const triggerStars = () => {
  const defaults = {
    spread: 360,
    ticks: 50,
    gravity: 0,
    decay: 0.94,
    startVelocity: 30,
    shapes: ['star'] as confetti.Shape[],
    colors: ['#FFE400', '#FFBD00', '#E89400', '#FFCA6C', '#FDFFB8'],
  };

  confetti({
    ...defaults,
    particleCount: 40,
    scalar: 1.2,
    shapes: ['star'] as confetti.Shape[],
  });

  confetti({
    ...defaults,
    particleCount: 10,
    scalar: 0.75,
    shapes: ['circle'] as confetti.Shape[],
  });
};

export const triggerEmoji = (emoji: string) => {
  const scalar = 2;
  const unicorn = confetti.shapeFromText({ text: emoji, scalar });

  const defaults = {
    spread: 360,
    ticks: 60,
    gravity: 0.5,
    decay: 0.96,
    startVelocity: 20,
    shapes: [unicorn],
    scalar,
  };

  confetti({
    ...defaults,
    particleCount: 30,
  });

  confetti({
    ...defaults,
    particleCount: 5,
  });

  confetti({
    ...defaults,
    particleCount: 15,
    scalar: scalar / 2,
    shapes: ['circle'] as confetti.Shape[],
  });
};
