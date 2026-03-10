import { useEffect, useRef } from "react";

interface VolumeBarsProps {
  micVolumeRef: React.RefObject<number>;
  speakerVolumeRef: React.RefObject<number>;
}

export default function VolumeBars({
  micVolumeRef,
  speakerVolumeRef,
}: VolumeBarsProps) {
  const micBarRef = useRef<HTMLDivElement>(null);
  const speakerBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let raf: number;
    const update = () => {
      if (micBarRef.current) {
        micBarRef.current.style.width = `${micVolumeRef.current * 100}%`;
      }
      if (speakerBarRef.current) {
        speakerBarRef.current.style.width = `${speakerVolumeRef.current * 100}%`;
      }
      raf = requestAnimationFrame(update);
    };
    raf = requestAnimationFrame(update);
    return () => cancelAnimationFrame(raf);
  }, [micVolumeRef, speakerVolumeRef]);

  return (
    <div style={styles.container}>
      <div style={styles.track}>
        <div ref={micBarRef} style={styles.micBar} />
      </div>
      <div style={styles.track}>
        <div ref={speakerBarRef} style={styles.speakerBar} />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  track: {
    height: "3px",
    backgroundColor: "#1a1a2e",
  },
  micBar: {
    height: "100%",
    backgroundColor: "#e67e22",
    width: "0%",
    transition: "width 60ms linear",
  },
  speakerBar: {
    height: "100%",
    backgroundColor: "#2980b9",
    width: "0%",
    transition: "width 60ms linear",
  },
};
