import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { AudioRecorder } from "@/components/AudioRecorder";
import {
  useGetLecture,
  useGetUploadUrl,
  useProcessLecture,
  useChat,
  getGetLectureQueryKey,
} from "@workspace/api-client-react";
import { StatusBadge } from "@/components/StatusBadge";
import {
  FileText, ListTodo, Send, Bot, User as UserIcon,
  Loader2, RefreshCw, Mic, Upload as UploadIcon, Calendar, Volume2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from "react-markdown";

export default function LectureDetail() {
  const [, params] = useRoute("/lectures/:id");
  const id = parseInt(params?.id || "0");
  const { dbUser, firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lecture, isLoading } = useGetLecture(id, {
    query: {
      enabled: !!id,
      queryKey: getGetLectureQueryKey(id),
      refetchInterval: (q) => (q.state.data?.status === "processing" ? 3000 : false),
    },
  });

  const uploadUrlMutation = useGetUploadUrl();
  const processMutation = useProcessLecture();
  const chatMutation = useChat();

  // File upload (alternative to mic)
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! I'm your AI assistant for this lecture. Ask me anything about the transcript or summary!" },
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const getUploadUrlAndProcess = async (blob: Blob, fileName: string, contentType: string): Promise<string> => {
    const { uploadUrl, publicUrl } = await uploadUrlMutation.mutateAsync({
      id,
      data: { fileName, contentType },
    });

    await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": contentType },
    });

    return publicUrl;
  };

  const handleRecordingUploadSuccess = async (audioUrl: string) => {
    try {
      await processMutation.mutateAsync({ id, data: { audioUrl } });
      toast({ title: "Processing started", description: "AI is transcribing your lecture. This may take a minute." });
      queryClient.invalidateQueries({ queryKey: getGetLectureQueryKey(id) });
    } catch {
      toast({ title: "Processing failed", description: "Audio was uploaded but processing failed.", variant: "destructive" });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) setUploadFile(e.target.files[0]);
  };

  const handleFileUploadAndProcess = async () => {
    if (!uploadFile || !firebaseUser) return;
    setIsFileUploading(true);
    try {
      const ext = uploadFile.name.split(".").pop() ?? "mp3";
      const fileName = `lecture-${id}-${Date.now()}.${ext}`;
      const publicUrl = await getUploadUrlAndProcess(uploadFile, fileName, uploadFile.type);
      await processMutation.mutateAsync({ id, data: { audioUrl: publicUrl } });
      toast({ title: "Processing started", description: "AI is transcribing your lecture." });
      queryClient.invalidateQueries({ queryKey: getGetLectureQueryKey(id) });
      setUploadFile(null);
    } catch {
      toast({ title: "Upload failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsFileUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !firebaseUser) return;

    const userMsg = message;
    setMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: userMsg }]);

    try {
      const res = await chatMutation.mutateAsync({
        data: { lectureId: id, message: userMsg, firebaseUid: firebaseUser.uid },
      });
      setChatHistory((prev) => [...prev, { role: "ai", content: res.answer }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "ai", content: "Sorry, I couldn't process that right now." }]);
    }
  };

  if (isLoading || !lecture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const isTeacher = dbUser?.role === "teacher";

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header */}
        <div className="bg-card border border-border rounded-3xl p-5 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-foreground mb-2">{lecture.title}</h1>
              <p className="text-base sm:text-lg text-muted-foreground">{lecture.description}</p>
            </div>
            <div className="shrink-0">
              <StatusBadge status={lecture.status} />
            </div>
          </div>
        </div>

        {/* Audio Player Section */}
        {lecture.audioUrl && (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <div className="bg-primary/10 p-4 rounded-2xl shrink-0">
              <Volume2 className="w-8 h-8 text-primary" />
            </div>
            <div className="flex-1 w-full">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-foreground">Lecture Recording</h3>
                <span className="text-xs text-muted-foreground font-mono">Original Audio</span>
              </div>
              <audio 
                src={lecture.audioUrl} 
                controls 
                className="w-full h-10 rounded-lg accent-primary"
              />
            </div>
          </div>
        )}

        {/* Teacher Audio Controls — pending status */}
        {isTeacher && lecture.status === "pending" && (
          <div className="space-y-4">
            <h2 className="text-xl font-display font-bold text-foreground flex items-center gap-2">
              <Mic className="w-5 h-5 text-primary" /> Add Lecture Audio
            </h2>

            {/* Mic Recorder */}
            <AudioRecorder
              lectureId={id}
              uploadFn={getUploadUrlAndProcess}
              onUploadSuccess={handleRecordingUploadSuccess}
            />

            {/* Divider */}
            <div className="flex items-center gap-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-sm text-muted-foreground font-medium">or upload a file</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* File Upload */}
            <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
              <input
                type="file"
                accept="audio/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2.5 bg-secondary border border-border hover:bg-secondary/80 text-foreground rounded-xl font-medium transition-colors"
              >
                <UploadIcon className="w-5 h-5" />
                {uploadFile ? uploadFile.name : "Choose Audio File"}
              </button>
              {uploadFile && (
                <button
                  onClick={handleFileUploadAndProcess}
                  disabled={isFileUploading}
                  className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-semibold shadow-md shadow-primary/20 transition-all disabled:opacity-60"
                >
                  {isFileUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UploadIcon className="w-4 h-4" />}
                  {isFileUploading ? "Uploading…" : "Upload & Process"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Processing Banner */}
        {lecture.status === "processing" && (
          <div className="p-8 bg-blue-50 border border-blue-100 rounded-2xl flex flex-col items-center text-blue-800">
            <RefreshCw className="w-10 h-10 animate-spin mb-4 text-blue-500" />
            <p className="text-lg font-semibold">AI is analyzing your lecture…</p>
            <p className="text-sm opacity-80 mt-1">Transcribing audio and extracting tasks. Usually under a minute.</p>
          </div>
        )}

        {/* Content — done */}
        {lecture.status === "done" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Summary */}
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">AI Summary</h2>
                </div>
                <div className="prose prose-blue max-w-none text-foreground/90 leading-relaxed text-sm sm:text-base">
                  <ReactMarkdown>
                    {lecture.summary || "No summary available."}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Transcript */}
              <div className="bg-card border border-border rounded-3xl p-6 sm:p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-secondary p-2 rounded-xl">
                    <Mic className="w-6 h-6 text-foreground" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-display font-bold text-foreground">Transcript</h2>
                </div>
                <div className="bg-secondary/30 p-4 sm:p-6 rounded-2xl max-h-[400px] overflow-y-auto font-mono text-xs sm:text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap border border-border/50">
                  {lecture.transcript || "No transcript available."}
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-8">
              {/* Tasks */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-amber-500/10 p-2 rounded-xl">
                    <ListTodo className="w-5 h-5 text-amber-600" />
                  </div>
                  <h2 className="text-xl font-display font-bold text-foreground">Extracted Tasks</h2>
                </div>
                {lecture.tasks && lecture.tasks.length > 0 ? (
                  <div className="space-y-4">
                    {lecture.tasks.map((task) => (
                      <div key={task.id} className="p-4 border border-border rounded-2xl bg-background">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-foreground">{task.title}</h4>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        {task.deadline && (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">
                            <Calendar className="w-3 h-3" /> Due: {task.deadline}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm text-center py-4">No tasks found.</p>
                )}
              </div>

              {/* Student Chatbot */}
              {!isTeacher && (
                <div className="bg-card border border-border rounded-3xl flex flex-col h-[500px] shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-border bg-secondary/50 flex items-center gap-3">
                    <div className="bg-primary/20 p-2 rounded-lg">
                      <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-bold text-foreground">Study Assistant</h3>
                  </div>

                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          {msg.role === "user" ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-secondary text-foreground rounded-tl-none"}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="p-3 rounded-2xl bg-secondary text-foreground rounded-tl-none flex gap-1 items-center">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-border bg-background">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Ask about the lecture…"
                        className="flex-1 px-4 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        disabled={chatMutation.isPending}
                      />
                      <button
                        type="submit"
                        disabled={chatMutation.isPending || !message.trim()}
                        className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
