// src/furnace3d/utils/exportVideo.js
export async function exportVideo(canvas, historicalRuns, setCurrentRunIndex) {
  if (!canvas || historicalRuns.length === 0) return;
  const stream = canvas.captureStream(30);
  const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
  const chunks = [];
  recorder.ondataavailable = e => chunks.push(e.data);
  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "furnace_animation.webm";
    a.click();
  };
  recorder.start(1000 / 30);
  let frame = 0;
  const totalFrames = historicalRuns.length * 30;
  const interval = setInterval(() => {
    if (frame >= totalFrames) {
      clearInterval(interval);
      recorder.stop();
      return;
    }
    const runIndex = Math.floor(frame / 30) % historicalRuns.length;
    setCurrentRunIndex(runIndex);
    frame++;
  }, 1000 / 30);
}