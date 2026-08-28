export class SoundEngine {
  private ctx: AudioContext | null = null;
  public isMuted = false;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;

  // Authentic Preloaded Sample Buffers
  private audioBuffers: Map<string, AudioBuffer> = new Map();
  private lastThrustTime = 0;
  private lastExplosionTime = 0;

  constructor() {
    this.preloadOriginalSounds();
  }

  private initCtx(): boolean {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtxClass) return false;
      this.ctx = new AudioCtxClass();

      // Master gain node with calibrated headroom
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.55, this.ctx.currentTime);

      // Gentle lowpass filter to prevent digital aliasing harshness
      this.filterNode = this.ctx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(15000, this.ctx.currentTime);
      this.filterNode.Q.setValueAtTime(0.7, this.ctx.currentTime);

      // Dynamics Compressor / Master Limiter to prevent clipping
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-16, this.ctx.currentTime);
      compressor.knee.setValueAtTime(24, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(10, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.12, this.ctx.currentTime);

      this.masterGain.connect(this.filterNode);
      this.filterNode.connect(compressor);
      compressor.connect(this.ctx.destination);
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    return true;
  }

  private async preloadOriginalSounds(): Promise<void> {
    const soundFiles: Record<string, string> = {
      snd_fire: '/audio/fire.wav',
      snd_explosion: '/audio/explosion.wav',
      snd_powerup: '/audio/magic.wav',
      snd_thrust: '/audio/thrust.wav',
    };

    for (const [key, url] of Object.entries(soundFiles)) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          if (!this.initCtx() || !this.ctx) continue;
          const decoded = await this.ctx.decodeAudioData(arrayBuffer);
          this.audioBuffers.set(key, decoded);
        }
      } catch {
        // Fallback to synthesis
      }
    }
  }

  private playSample(key: string, volume = 0.7, pitch = 1.0): boolean {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return false;

    const buffer = this.audioBuffers.get(key);
    if (!buffer) return false;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(pitch, this.ctx.currentTime);

    const gain = this.ctx.createGain();
    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.003);

    source.connect(gain);
    gain.connect(this.masterGain);

    source.start(now);
    source.onended = () => {
      try {
        source.disconnect();
        gain.disconnect();
      } catch {}
    };
    return true;
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.55, this.ctx.currentTime);
    }
    return this.isMuted;
  }

  /**
   * Laser firing sound effect - authentic original fire.wav with pitch scaling
   */
  public playLaser(bulletLevel = 0): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    // 1. Try playing authentic original sample
    const pitch = 1.0 + bulletLevel * 0.15;
    if (this.playSample('snd_fire', 0.5, pitch)) return;

    // 2. Synthesized fallback with clean envelope
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = bulletLevel > 1 ? 'sawtooth' : 'triangle';
    const startFreq = 920 + bulletLevel * 140;
    const endFreq = 160;

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.15, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /**
   * Authentic thrust sound pulse (thrust.wav from original Java GameBoard)
   */
  public setThrust(active: boolean): void {
    if (!active) return;

    if (this.isMuted || !this.initCtx() || !this.ctx) return;
    const now = this.ctx.currentTime;

    // Rate-limit thrust sample triggers to avoid audio stutter (matches original Java isRunning check)
    if (now - this.lastThrustTime > 0.18) {
      this.lastThrustTime = now;
      this.playSample('snd_thrust', 0.28, 1.0);
    }
  }

  /**
   * Authentic explosion sound (explosion.wav)
   */
  public playExplosion(large = false): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    // Rate limit concurrent explosions to prevent acoustic clipping
    if (now - this.lastExplosionTime < 0.03 && !large) return;
    this.lastExplosionTime = now;

    // 1. Try playing authentic original sample
    if (this.playSample('snd_explosion', large ? 0.75 : 0.45, large ? 0.85 : 1.0)) return;

    // 2. Synthesized fallback
    const duration = large ? 0.45 : 0.25;

    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();

    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(large ? 120 : 150, now);
    subOsc.frequency.exponentialRampToValueAtTime(25, now + duration);

    subGain.gain.setValueAtTime(0.0001, now);
    subGain.gain.linearRampToValueAtTime(large ? 0.25 : 0.16, now + 0.004);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);

    subOsc.start(now);
    subOsc.stop(now + duration);

    subOsc.onended = () => {
      try {
        subOsc.disconnect();
        subGain.disconnect();
      } catch {}
    };
  }

  /**
   * Authentic powerup pickup sound (magic.wav)
   */
  public playPowerup(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    // 1. Try playing authentic original sample
    if (this.playSample('snd_powerup', 0.65, 1.0)) return;

    // 2. Synthesized fallback
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.035;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.12);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    });
  }

  /**
   * Resonant impact ping when primary lasers strike a wormhole or powerup
   */
  public playWormholeHit(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.09);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.18, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.09);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /**
   * Special ability trigger sound
   */
  public playSpecial(type: number): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const freqs = [350, 480, 620, 800];

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = type === 1 ? 'sawtooth' : 'sine';
      const t = now + idx * 0.03;
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.1, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.16);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    });
  }

  /**
   * Shield activation / impact
   */
  public playShield(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, now);
    osc.frequency.linearRampToValueAtTime(680, now + 0.10);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.14, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.10);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.10);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /**
   * Zap Screen sound effect
   */
  public playZap(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(80, now + 0.3);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.2, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /**
   * Match countdown beep
   */
  public playCountdownBeep(isHighPitch = false): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(isHighPitch ? 880 : 440, this.ctx.currentTime);

    const now = this.ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + (isHighPitch ? 0.25 : 0.12));

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + (isHighPitch ? 0.25 : 0.12));

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  public playClick(): void {
    this.playCountdownBeep(true);
  }

  /**
   * Victory fanfare arpeggio
   */
  public playVictoryFanfare(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.1;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.18, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.35);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    });
  }

  /**
   * Defeat fanfare
   */
  public playDefeatFanfare(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const notes = [392.0, 311.13, 261.63, 196.0];
    const now = this.ctx.currentTime;

    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.15;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.15, t + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.4);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    });
  }

  /**
   * Wormhole weapon charging hum
   */
  public playWormholeCharge(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(160, now);
    osc.frequency.exponentialRampToValueAtTime(580, now + 0.3);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.003);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.3);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /**
   * Sleek high-tech UI button click
   */
  public playUIClick(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.035);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.035);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }

  /**
   * High-tech data shuffle / randomize tone sequence
   */
  public playUIRandomize(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const freqs = [784, 1046.5, 1318.5]; // G5, C6, E6

    freqs.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.03;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.09, t + 0.003);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(t);
      osc.stop(t + 0.05);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    });
  }

  /**
   * Affirmative sci-fi confirmation chord (for avatar or callsign selection)
   */
  public playUISelect(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const freqs = [659.25, 987.77]; // E5 + B5 warm fifth chord

    freqs.forEach((freq) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now);
      osc.stop(now + 0.12);

      osc.onended = () => {
        try {
          osc.disconnect();
          gain.disconnect();
        } catch {}
      };
    });
  }

  /**
   * Subtle ambient UI modal open sweep
   */
  public playUIOpenModal(): void {
    if (this.isMuted || !this.initCtx() || !this.ctx || !this.masterGain) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.07, now + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(now);
    osc.stop(now + 0.08);

    osc.onended = () => {
      try {
        osc.disconnect();
        gain.disconnect();
      } catch {}
    };
  }
}

