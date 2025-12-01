// Audio system - mimics Apple II speaker clicks

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

// Generate a click/beep sound (Apple II style)
function playTone(frequency: number, duration: number, volume: number = 0.1): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'square';
    oscillator.frequency.value = frequency;

    gainNode.gain.setValueAtTime(volume, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  } catch {
    // Audio not available
  }
}

// Sound effects
export const sounds = {
  // Gun firing
  fire(): void {
    playTone(200, 0.05, 0.15);
    setTimeout(() => playTone(150, 0.03, 0.1), 20);
  },

  // Explosion (flier destroyed)
  explosion(): void {
    playTone(80, 0.1, 0.2);
    setTimeout(() => playTone(60, 0.15, 0.15), 50);
    setTimeout(() => playTone(40, 0.2, 0.1), 100);
  },

  // Small explosion (paratrooper hit)
  smallExplosion(): void {
    playTone(120, 0.05, 0.1);
    setTimeout(() => playTone(80, 0.08, 0.08), 30);
  },

  // Helicopter/flier sound (continuous)
  flierTick(): void {
    playTone(100 + Math.random() * 20, 0.02, 0.03);
  },

  // Parachute opening
  chuteOpen(): void {
    playTone(400, 0.03, 0.05);
    setTimeout(() => playTone(600, 0.02, 0.03), 30);
  },

  // Bomb falling (descending pitch)
  bombFall(): void {
    playTone(300, 0.03, 0.05);
  },

  // Gun destroyed
  gunDestroyed(): void {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        playTone(60 - i * 10, 0.15, 0.2 - i * 0.03);
      }, i * 100);
    }
  },

  // Paratrooper landing
  landing(): void {
    playTone(150, 0.02, 0.05);
  },

  // Sabotage start
  sabotageStart(): void {
    playTone(200, 0.1, 0.1);
    setTimeout(() => playTone(180, 0.1, 0.1), 100);
    setTimeout(() => playTone(160, 0.1, 0.1), 200);
  },

  // Menu select
  menuSelect(): void {
    playTone(440, 0.05, 0.1);
    setTimeout(() => playTone(660, 0.05, 0.1), 50);
  },
};

// Initialize audio context on first user interaction
export function initAudio(): void {
  try {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
  } catch {
    // Audio not available
  }
}
