// A quiet original three-note motif, generated entirely on this device.
export function makeSound() {
  let ctx,
    master,
    timer,
    enabled = false,
    step = 0,
    bed = [];
  function note(hz, duration, volume) {
    if (!enabled || !ctx) return;
    const o = ctx.createOscillator(),
      g = ctx.createGain(),
      now = ctx.currentTime;
    o.frequency.value = hz;
    o.type = "sine";
    g.gain.setValueAtTime(0.0001, now);
    g.gain.exponentialRampToValueAtTime(volume, now + 0.07);
    g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    o.connect(g).connect(master);
    o.start();
    o.stop(now + duration + 0.03);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  async function toggle() {
    if (enabled) {
      enabled = false;
      clearInterval(timer);
      master.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
      bed.forEach((o) => {
        o.stop(ctx.currentTime + 0.25);
        o.onended = () => o.disconnect();
      });
      bed = [];
      return false;
    }
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return false;
    ctx ??= new Audio();
    await ctx.resume();
    if (!master) {
      master = ctx.createGain();
      master.connect(ctx.destination);
    }
    enabled = true;
    master.gain.setTargetAtTime(0.19, ctx.currentTime, 0.12);
    for (const hz of [130.81, 196]) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = hz;
      g.gain.value = 0.047;
      o.connect(g).connect(master);
      o.start();
      bed.push(o);
    }
    const phrase = () => {
      note([329.63, 392, 293.66, 349.23, 261.63, 392][step++ % 6], 2.9, 0.11);
    };
    phrase();
    timer = setInterval(phrase, 3350);
    return true;
  }
  return { toggle, chime: () => note(659.25, 0.55, 0.075) };
}
