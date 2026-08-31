// src/furnace3d/utils/soundAlerts.js
let audioContext = null;

export function playAlertSound() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.frequency.value = 800;
  oscillator.type = "square";
  gain.gain.value = 0.3;
  oscillator.start();
  setTimeout(() => oscillator.stop(), 300);
  setTimeout(() => {
    const osc2 = audioContext.createOscillator();
    const gain2 = audioContext.createGain();
    osc2.connect(gain2);
    gain2.connect(audioContext.destination);
    osc2.frequency.value = 1000;
    osc2.type = "square";
    gain2.gain.value = 0.3;
    osc2.start();
    setTimeout(() => osc2.stop(), 300);
  }, 400);
}