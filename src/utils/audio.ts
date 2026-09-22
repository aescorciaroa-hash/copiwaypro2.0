// Utilidad de sintetizador de audio Web Audio API para alertas de pedidos
// No depende de recursos externos ni enlaces mp3 que puedan fallar por CORS o 404

class SoundEffects {
  private ctx: AudioContext | null = null;
  private soundEnabled: boolean = true;

  constructor() {
    // Lazy initialization on first user interaction
    const saved = localStorage.getItem('copiway_sound_enabled');
    if (saved !== null) {
      this.soundEnabled = saved === 'true';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof window.AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    localStorage.setItem('copiway_sound_enabled', enabled ? 'true' : 'false');
  }

  public toggleSound(): boolean {
    const next = !this.soundEnabled;
    this.setEnabled(next);
    if (next) {
      this.playOrderBell();
    }
    return next;
  }

  // Tono de campana de comanda gastronómica (Chime)
  public playOrderBell(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Nota 1 (Campana alta: C6 ~ 1046.5 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1046.5, now);
      osc1.frequency.exponentialRampToValueAtTime(523.25, now + 0.4);

      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.5);

      // Nota 2 (Armónico de confirmación: E6 ~ 1318.5 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.5, now + 0.12);
      osc2.frequency.exponentialRampToValueAtTime(659.25, now + 0.6);

      gain2.gain.setValueAtTime(0.001, now);
      gain2.gain.setValueAtTime(0.35, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.12);
      osc2.stop(now + 0.7);

      // Nota 3 (G6 ~ 1567.98 Hz - acorde mayor triunfal)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1567.98, now + 0.24);

      gain3.gain.setValueAtTime(0.001, now);
      gain3.gain.setValueAtTime(0.4, now + 0.24);
      gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);

      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.24);
      osc3.stop(now + 0.9);
    } catch (e) {
      console.warn('Audio notification blocked or failed:', e);
    }
  }

  // Tono de alerta de inventario crítico
  public playCriticalAlert(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(880, now + 0.1);
      osc.frequency.setValueAtTime(440, now + 0.2);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('Audio critical alert failed:', e);
    }
  }
}

export const soundFx = new SoundEffects();
