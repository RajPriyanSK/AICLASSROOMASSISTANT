import { useState, useRef, useCallback, useEffect } from "react";

export type RecordingState = "idle" | "requesting" | "recording" | "stopped" | "error";

export interface AudioRecorderReturn {
  state: RecordingState;
  audioBlob: Blob | null;
  audioUrl: string | null;
  durationMs: number;
  volumeLevel: number;
  errorMessage: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  clearRecording: () => void;
  isRecording: boolean;
}

export function useAudioRecorder(): AudioRecorderReturn {
  const [state, setState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [durationMs, setDurationMs] = useState(0);
  const [volumeLevel, setVolumeLevel] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const startTime = useRef<number>(0);
  const durationTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopVolumeAnalysis = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setVolumeLevel(0);
  };

  const startVolumeAnalysis = (stream: MediaStream) => {
    try {
      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setVolumeLevel(Math.min(100, Math.round(avg * 2)));
        animFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch {
      // AnalyserNode not critical
    }
  };

  const startRecording = useCallback(async () => {
    setState("requesting");
    setErrorMessage(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });
      streamRef.current = stream;

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorder.current = recorder;
      audioChunks.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunks.current, { type: mimeType || "audio/webm" });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        setState("stopped");
        stopVolumeAnalysis();
        stream.getTracks().forEach((t) => t.stop());
        if (durationTimer.current) clearInterval(durationTimer.current);
      };

      recorder.onerror = () => {
        setState("error");
        setErrorMessage("Recording failed unexpectedly.");
        stopVolumeAnalysis();
        stream.getTracks().forEach((t) => t.stop());
        if (durationTimer.current) clearInterval(durationTimer.current);
      };

      recorder.start(250);
      startTime.current = Date.now();
      setDurationMs(0);
      setState("recording");
      startVolumeAnalysis(stream);

      durationTimer.current = setInterval(() => {
        setDurationMs(Date.now() - startTime.current);
      }, 200);
    } catch (err: any) {
      const msg =
        err.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow it in your browser settings."
          : err.name === "NotFoundError"
          ? "No microphone found. Please connect one and try again."
          : `Microphone error: ${err.message}`;
      setState("error");
      setErrorMessage(msg);
    }
  }, []);

  const stopRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state === "recording") {
      mediaRecorder.current.stop();
    }
  }, []);

  const clearRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDurationMs(0);
    setState("idle");
    setErrorMessage(null);
    audioChunks.current = [];
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      stopVolumeAnalysis();
      if (durationTimer.current) clearInterval(durationTimer.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return {
    state,
    audioBlob,
    audioUrl,
    durationMs,
    volumeLevel,
    errorMessage,
    startRecording,
    stopRecording,
    clearRecording,
    isRecording: state === "recording",
  };
}
