import { useRef, useState } from "react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import {
  Mic, Square, Upload, Play, Pause, Trash2,
  CheckCircle2, Loader2, AlertCircle, Radio,
} from "lucide-react";

interface AudioRecorderProps {
  lectureId: number;
  onUploadSuccess: (audioUrl: string) => void;
  onUploadStart?: () => void;
  uploadFn: (blob: Blob, fileName: string, contentType: string) => Promise<string>;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const secs = (totalSeconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

const BAR_COUNT = 30;

export function AudioRecorder({
  lectureId,
  onUploadSuccess,
  onUploadStart,
  uploadFn,
}: AudioRecorderProps) {
  const {
    state,
    audioBlob,
    audioUrl,
    durationMs,
    volumeLevel,
    errorMessage,
    startRecording,
    stopRecording,
    clearRecording,
  } = useAudioRecorder();

  const [isUploading, setIsUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const barsRef = useRef<number[]>(Array.from({ length: BAR_COUNT }, () => 10));

  if (state === "recording") {
    barsRef.current = [
      ...barsRef.current.slice(1),
      Math.max(15, Math.random() * volumeLevel + 10),
    ];
  }

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleUpload = async () => {
    if (!audioBlob) return;
    setIsUploading(true);
    setUploadError(null);
    onUploadStart?.();

    try {
      const ext = audioBlob.type.includes("mp4") ? "mp4" : audioBlob.type.includes("ogg") ? "ogg" : "webm";
      const fileName = `lecture-${lectureId}-${Date.now()}.${ext}`;
      const url = await uploadFn(audioBlob, fileName, audioBlob.type);
      setUploadDone(true);
      onUploadSuccess(url);
    } catch (err: any) {
      setUploadError(err.message ?? "Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    clearRecording();
    setUploadDone(false);
    setUploadError(null);
    setIsPlaying(false);
    barsRef.current = Array.from({ length: BAR_COUNT }, () => 10);
  };

  return (
    <div className="bg-card border border-border rounded-3xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl transition-colors ${state === "recording" ? "bg-red-100" : "bg-primary/10"}`}>
          <Mic className={`w-5 h-5 ${state === "recording" ? "text-red-600" : "text-primary"}`} />
        </div>
        <div>
          <h3 className="font-bold text-foreground">Audio Recorder</h3>
          <p className="text-xs text-muted-foreground">Record lecture audio directly from your microphone</p>
        </div>
        {state === "recording" && (
          <div className="ml-auto flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm font-semibold px-3 py-1.5 rounded-full">
            <Radio className="w-3.5 h-3.5 animate-pulse" /> LIVE
          </div>
        )}
      </div>

      {/* Waveform Visualizer */}
      <div className="flex items-center justify-center gap-[3px] h-16 bg-secondary/40 rounded-2xl px-4 border border-border/50">
        {barsRef.current.map((h, i) => (
          <div
            key={i}
            className={`w-1.5 rounded-full transition-all duration-75 ${
              state === "recording" ? "bg-red-500" : state === "stopped" ? "bg-primary/60" : "bg-muted-foreground/20"
            }`}
            style={{ height: `${Math.max(10, Math.min(h, 90))}%` }}
          />
        ))}
      </div>

      {/* Timer */}
      <div className="text-center">
        <span className={`text-3xl font-mono font-bold tabular-nums ${state === "recording" ? "text-red-600" : "text-foreground"}`}>
          {formatDuration(durationMs)}
        </span>
        <p className="text-xs text-muted-foreground mt-1 capitalize">
          {state === "idle" && "Ready to record"}
          {state === "requesting" && "Requesting microphone access…"}
          {state === "recording" && "Recording in progress"}
          {state === "stopped" && `Recorded — ${formatDuration(durationMs)}`}
          {state === "error" && "Error"}
        </p>
      </div>

      {/* Error */}
      {(errorMessage || uploadError) && (
        <div className="flex items-start gap-3 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{errorMessage ?? uploadError}</span>
        </div>
      )}

      {/* Success */}
      {uploadDone && (
        <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm text-emerald-700 font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          Audio uploaded successfully! Processing will begin shortly.
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Record / Stop */}
        {(state === "idle" || state === "error") && (
          <button
            onClick={startRecording}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95"
          >
            <Mic className="w-5 h-5" />
            Start Recording
          </button>
        )}

        {state === "requesting" && (
          <button disabled className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-100 text-red-600 font-semibold rounded-2xl opacity-80">
            <Loader2 className="w-5 h-5 animate-spin" />
            Requesting Access…
          </button>
        )}

        {state === "recording" && (
          <button
            onClick={stopRecording}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-red-500/20 active:scale-95 animate-pulse"
          >
            <Square className="w-5 h-5 fill-current" />
            Stop Recording
          </button>
        )}

        {state === "stopped" && !uploadDone && (
          <>
            {/* Playback */}
            <button
              onClick={togglePlayback}
              className="p-3 bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-2xl transition-colors"
              title={isPlaying ? "Pause" : "Play recording"}
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
            </button>

            {/* Upload */}
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-2xl transition-all shadow-lg shadow-primary/20 active:scale-95 disabled:opacity-60"
            >
              {isUploading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Uploading…</>
              ) : (
                <><Upload className="w-5 h-5" /> Upload & Process</>
              )}
            </button>

            {/* Discard */}
            <button
              onClick={handleReset}
              disabled={isUploading}
              className="p-3 bg-secondary border border-border hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive text-muted-foreground rounded-2xl transition-colors disabled:opacity-50"
              title="Discard recording"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </>
        )}

        {uploadDone && (
          <button
            onClick={handleReset}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-secondary border border-border hover:bg-secondary/80 text-foreground font-semibold rounded-2xl transition-colors"
          >
            <Mic className="w-5 h-5" /> Record Another
          </button>
        )}
      </div>

      {/* Hidden audio element for playback */}
      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          onPause={() => setIsPlaying(false)}
          className="hidden"
        />
      )}

      <p className="text-center text-xs text-muted-foreground">
        Audio is recorded locally and only uploaded when you click "Upload & Process"
      </p>
    </div>
  );
}
