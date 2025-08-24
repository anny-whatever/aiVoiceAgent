import { useRef, useCallback } from "react";

export const useAudio = () => {
  const dingCtxRef = useRef<AudioContext | null>(null);

  const playDing = useCallback((frequency = 800, duration = 150) => {
    dingCtxRef.current ??= new (window.AudioContext ||
      (window as any).webkitAudioContext)();

    const osc = dingCtxRef.current.createOscillator();
    const gain = dingCtxRef.current.createGain();

    osc.connect(gain);
    gain.connect(dingCtxRef.current.destination);
    osc.type = "sine";
    osc.frequency.value = frequency;
    gain.gain.value = 0.1;
    osc.start();

    setTimeout(() => {
      osc.stop();
      osc.disconnect();
      gain.disconnect();
    }, duration);
  }, []);

  const userDing = useCallback(() => playDing(600, 150), [playDing]);
  const aiDing = useCallback(() => playDing(1000, 150), [playDing]);

  const controlMicrophone = useCallback(
    (micStream: MediaStream | null, enabled: boolean) => {
      if (micStream) {
        micStream.getAudioTracks().forEach((track) => {
          track.enabled = enabled;
        });
      }
    },
    []
  );

  return {
    userDing,
    aiDing,
    controlMicrophone,
  };
};
