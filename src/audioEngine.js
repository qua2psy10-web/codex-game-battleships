const safeNow = context => context.currentTime + 0.01;

export const createAudioEngine = () => {
  let context = null;
  let master = null;
  let ambience = null;
  let muted = false;

  const ensureContext = () => {
    if (typeof window === 'undefined') return null;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return null;
    if (!context) {
      context = new AudioContext();
      master = context.createGain();
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 18;
      compressor.ratio.value = 5;
      compressor.attack.value = .003;
      compressor.release.value = .25;
      master.gain.value = muted ? 0 : .72;
      master.connect(compressor).connect(context.destination);
    }
    if (context.state === 'suspended') context.resume().catch(() => {});
    return context;
  };

  const tone = ({ frequency, endFrequency = frequency, duration = .2, gain = .08, type = 'sine', delay = 0 }) => {
    const ctx = ensureContext();
    if (!ctx || !master || muted) return;
    const start = safeNow(ctx) + delay;
    const oscillator = ctx.createOscillator();
    const envelope = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(Math.max(1, frequency), start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), start + duration);
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(.025, duration * .2));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    oscillator.connect(envelope).connect(master);
    oscillator.start(start);
    oscillator.stop(start + duration + .03);
  };

  const noise = ({ duration = .25, gain = .12, frequency = 900, type = 'lowpass', delay = 0, q = .7 }) => {
    const ctx = ensureContext();
    if (!ctx || !master || muted) return;
    const start = safeNow(ctx) + delay;
    const frameCount = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, frameCount, ctx.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) samples[index] = (Math.random() * 2 - 1) * (1 - index / frameCount * .55);
    const source = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const envelope = ctx.createGain();
    source.buffer = buffer;
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    envelope.gain.setValueAtTime(.0001, start);
    envelope.gain.exponentialRampToValueAtTime(gain, start + Math.min(.018, duration * .15));
    envelope.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter).connect(envelope).connect(master);
    source.start(start);
  };

  const play = (kind) => {
    if (muted) return;
    switch (kind) {
      case 'ui':
        tone({ frequency: 760, endFrequency: 920, duration: .055, gain: .035 });
        break;
      case 'start':
        tone({ frequency: 105, endFrequency: 62, duration: .55, gain: .13, type: 'sawtooth' });
        tone({ frequency: 540, endFrequency: 720, duration: .18, gain: .045, delay: .12 });
        tone({ frequency: 720, endFrequency: 960, duration: .2, gain: .045, delay: .31 });
        break;
      case 'launch':
        noise({ duration: .42, gain: .18, frequency: 760, type: 'lowpass' });
        tone({ frequency: 190, endFrequency: 48, duration: .45, gain: .16, type: 'sawtooth' });
        tone({ frequency: 980, endFrequency: 240, duration: .22, gain: .05, type: 'square' });
        break;
      case 'impact':
        noise({ duration: .7, gain: .29, frequency: 1050, type: 'lowpass' });
        tone({ frequency: 92, endFrequency: 29, duration: .72, gain: .27, type: 'sine' });
        tone({ frequency: 180, endFrequency: 52, duration: .32, gain: .13, type: 'sawtooth' });
        break;
      case 'miss':
        noise({ duration: .42, gain: .12, frequency: 1800, type: 'highpass' });
        tone({ frequency: 420, endFrequency: 170, duration: .3, gain: .05 });
        break;
      case 'warning':
        tone({ frequency: 620, duration: .16, gain: .085, type: 'square' });
        tone({ frequency: 780, duration: .16, gain: .085, type: 'square', delay: .23 });
        tone({ frequency: 620, duration: .16, gain: .085, type: 'square', delay: .46 });
        break;
      case 'sonar':
        tone({ frequency: 1180, endFrequency: 540, duration: .95, gain: .12 });
        tone({ frequency: 1180, endFrequency: 540, duration: .8, gain: .035, delay: .28 });
        break;
      case 'intercept':
        tone({ frequency: 380, endFrequency: 1680, duration: .24, gain: .09, type: 'sawtooth' });
        noise({ duration: .25, gain: .14, frequency: 1500, type: 'bandpass', delay: .2, q: 2 });
        break;
      case 'ew':
        tone({ frequency: 210, endFrequency: 760, duration: .52, gain: .07, type: 'square' });
        tone({ frequency: 860, endFrequency: 260, duration: .52, gain: .055, type: 'sawtooth' });
        break;
      case 'decoy':
        noise({ duration: .5, gain: .13, frequency: 2600, type: 'highpass' });
        tone({ frequency: 760, endFrequency: 240, duration: .38, gain: .055 });
        break;
      case 'jet':
        noise({ duration: 1.35, gain: .13, frequency: 920, type: 'bandpass', q: .5 });
        tone({ frequency: 78, endFrequency: 150, duration: 1.25, gain: .09, type: 'sawtooth' });
        break;
      case 'repair':
        noise({ duration: .28, gain: .055, frequency: 2200, type: 'bandpass', q: 3 });
        tone({ frequency: 240, endFrequency: 310, duration: .18, gain: .04, type: 'square' });
        tone({ frequency: 310, endFrequency: 410, duration: .18, gain: .04, type: 'square', delay: .2 });
        break;
      case 'victory':
        tone({ frequency: 392, duration: .45, gain: .075, type: 'triangle' });
        tone({ frequency: 523, duration: .45, gain: .075, type: 'triangle', delay: .2 });
        tone({ frequency: 659, duration: .72, gain: .09, type: 'triangle', delay: .4 });
        break;
      case 'defeat':
        tone({ frequency: 180, endFrequency: 82, duration: 1.25, gain: .13, type: 'sawtooth' });
        break;
      default:
        break;
    }
  };

  const startAmbience = () => {
    const ctx = ensureContext();
    if (!ctx || !master || ambience || muted) return;
    const hum = ctx.createOscillator();
    const humGain = ctx.createGain();
    const machinery = ctx.createOscillator();
    const machineryGain = ctx.createGain();
    hum.type = 'sine';
    hum.frequency.value = 44;
    humGain.gain.value = .018;
    machinery.type = 'triangle';
    machinery.frequency.value = 71;
    machineryGain.gain.value = .008;
    hum.connect(humGain).connect(master);
    machinery.connect(machineryGain).connect(master);
    hum.start();
    machinery.start();
    ambience = { hum, machinery };
  };

  const stopAmbience = () => {
    if (!ambience) return;
    try { ambience.hum.stop(); ambience.machinery.stop(); } catch { /* already stopped */ }
    ambience = null;
  };

  const setMuted = (nextMuted) => {
    muted = nextMuted;
    if (master && context) master.gain.setTargetAtTime(muted ? 0 : .72, context.currentTime, .025);
    if (muted) stopAmbience();
  };

  const dispose = () => {
    stopAmbience();
    context?.close().catch(() => {});
    context = null;
    master = null;
  };

  return { play, startAmbience, stopAmbience, setMuted, dispose };
};
