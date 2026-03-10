/**
 * Monitors audio volume from a MediaStream using AnalyserNode.
 * Writes RMS volume (0–1) to a ref at ~60fps via requestAnimationFrame.
 * Returns a cleanup function.
 */
export function startVolumeMonitor(
  stream: MediaStream,
  volumeRef: { current: number }
): () => void {
  const ctx = new AudioContext();
  const source = ctx.createMediaStreamSource(stream);
  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  source.connect(analyser);

  const dataArray = new Uint8Array(analyser.fftSize);
  let raf = 0;

  const monitor = () => {
    analyser.getByteTimeDomainData(dataArray);
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const v = (dataArray[i] - 128) / 128;
      sum += v * v;
    }
    volumeRef.current = Math.min(1, Math.sqrt(sum / dataArray.length) * 3);
    raf = requestAnimationFrame(monitor);
  };
  raf = requestAnimationFrame(monitor);

  return () => {
    cancelAnimationFrame(raf);
    source.disconnect();
    ctx.close().catch(() => {});
    volumeRef.current = 0;
  };
}
