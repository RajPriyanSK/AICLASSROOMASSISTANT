import { useState, useRef, useEffect } from "react";
import { useRoute } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useGetLecture, 
  useGetUploadUrl, 
  useProcessLecture, 
  useChat,
  getGetLectureQueryKey
} from "@workspace/api-client-react";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { StatusBadge } from "@/components/StatusBadge";
import { Mic, Square, Upload, Play, FileText, ListTodo, Send, Bot, User as UserIcon, Loader2, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export default function LectureDetail() {
  const [, params] = useRoute("/lectures/:id");
  const id = parseInt(params?.id || "0");
  const { dbUser, firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: lecture, isLoading } = useGetLecture(id, { query: { enabled: !!id, refetchInterval: (q) => q.state.data?.status === 'processing' ? 3000 : false } });
  const uploadUrlMutation = useGetUploadUrl();
  const processMutation = useProcessLecture();
  const chatMutation = useChat();

  // Audio recording & upload state
  const { isRecording, audioBlob, startRecording, stopRecording, clearRecording } = useAudioRecorder();
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Chat state
  const [message, setMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([
    { role: 'ai', content: "Hi! I'm your AI assistant for this lecture. Ask me anything about the transcript or summary!" }
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatHistory]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
      clearRecording(); // Mutually exclusive
    }
  };

  const submitAudio = async () => {
    const fileToUpload = uploadFile || audioBlob;
    if (!fileToUpload || !firebaseUser) return;

    setIsUploading(true);
    try {
      // 1. Get upload URL
      const { uploadUrl, publicUrl } = await uploadUrlMutation.mutateAsync({
        id,
        data: {
          fileName: `lecture-${id}-${Date.now()}.${uploadFile ? 'mp3' : 'webm'}`,
          contentType: fileToUpload.type || "audio/webm",
        }
      });

      // 2. Upload to Supabase Storage
      await fetch(uploadUrl, {
        method: "PUT",
        body: fileToUpload,
        headers: { "Content-Type": fileToUpload.type || "audio/webm" }
      });

      // 3. Trigger processing
      await processMutation.mutateAsync({
        id,
        data: { audioUrl: publicUrl }
      });

      toast({ title: "Audio uploaded", description: "Processing started. This may take a minute." });
      queryClient.invalidateQueries({ queryKey: getGetLectureQueryKey(id) });
      setUploadFile(null);
      clearRecording();
    } catch (error) {
      toast({ title: "Upload failed", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !firebaseUser) return;

    const userMsg = message;
    setMessage("");
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);

    try {
      const res = await chatMutation.mutateAsync({
        data: {
          lectureId: id,
          message: userMsg,
          firebaseUid: firebaseUser.uid
        }
      });
      setChatHistory(prev => [...prev, { role: 'ai', content: res.answer }]);
    } catch (error) {
      toast({ title: "Chat error", description: "Failed to get response", variant: "destructive" });
      setChatHistory(prev => [...prev, { role: 'ai', content: "Sorry, I couldn't process that right now." }]);
    }
  };

  if (isLoading || !lecture) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const isTeacher = dbUser?.role === 'teacher';

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* Header Section */}
        <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-display font-bold text-foreground mb-2">{lecture.title}</h1>
              <p className="text-lg text-muted-foreground">{lecture.description}</p>
            </div>
            <StatusBadge status={lecture.status} />
          </div>
          
          {/* Teacher Audio Upload Controls */}
          {isTeacher && lecture.status === 'pending' && (
            <div className="mt-8 p-6 bg-secondary/50 border border-border rounded-2xl">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">Provide Lecture Audio</h3>
              
              <div className="flex flex-wrap items-center gap-4">
                {isRecording ? (
                  <button onClick={stopRecording} className="flex items-center gap-2 px-6 py-3 bg-red-100 text-red-700 hover:bg-red-200 rounded-xl font-medium transition-colors animate-pulse">
                    <Square className="w-5 h-5 fill-current" /> Stop Recording
                  </button>
                ) : (
                  <button onClick={startRecording} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl font-medium transition-colors">
                    <Mic className="w-5 h-5" /> Record Audio
                  </button>
                )}

                <span className="text-muted-foreground text-sm font-medium">OR</span>

                <input type="file" accept="audio/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
                <button onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 px-6 py-3 bg-background border border-border hover:bg-secondary text-foreground rounded-xl font-medium transition-colors">
                  <Upload className="w-5 h-5" /> Upload File
                </button>
              </div>

              {(audioBlob || uploadFile) && (
                <div className="mt-6 flex items-center justify-between p-4 bg-background border border-border rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-2 rounded-lg"><Play className="w-5 h-5 text-primary" /></div>
                    <span className="font-medium text-sm text-foreground">
                      {uploadFile ? uploadFile.name : "Recorded Audio"} ready
                    </span>
                  </div>
                  <button 
                    onClick={submitAudio} 
                    disabled={isUploading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-semibold shadow-md shadow-primary/20 transition-all disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Process Audio"}
                  </button>
                </div>
              )}
            </div>
          )}

          {lecture.status === 'processing' && (
            <div className="mt-8 p-6 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center flex-col text-blue-800">
              <RefreshCw className="w-8 h-8 animate-spin mb-3 text-blue-500" />
              <p className="font-medium">AI is transcribing and analyzing your lecture...</p>
              <p className="text-sm opacity-80 mt-1">This usually takes about a minute depending on length.</p>
            </div>
          )}
        </div>

        {/* Content Section (Only show if processing is done) */}
        {lecture.status === 'done' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-8">
              {/* Summary */}
              <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-primary/10 p-2 rounded-xl"><FileText className="w-6 h-6 text-primary" /></div>
                  <h2 className="text-2xl font-display font-bold text-foreground">AI Summary</h2>
                </div>
                <div className="prose prose-blue max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap">
                  {lecture.summary || "No summary available."}
                </div>
              </div>

              {/* Transcript */}
              <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-secondary p-2 rounded-xl"><Mic className="w-6 h-6 text-foreground" /></div>
                  <h2 className="text-2xl font-display font-bold text-foreground">Transcript</h2>
                </div>
                <div className="bg-secondary/30 p-6 rounded-2xl max-h-[400px] overflow-y-auto font-mono text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap border border-border/50">
                  {lecture.transcript || "No transcript available."}
                </div>
              </div>
            </div>

            {/* Sidebar: Tasks & Chat */}
            <div className="space-y-8">
              {/* Tasks List */}
              <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-amber-500/10 p-2 rounded-xl"><ListTodo className="w-5 h-5 text-amber-600" /></div>
                  <h2 className="text-xl font-display font-bold text-foreground">Extracted Tasks</h2>
                </div>
                
                {lecture.tasks && lecture.tasks.length > 0 ? (
                  <div className="space-y-4">
                    {lecture.tasks.map(task => (
                      <div key={task.id} className="p-4 border border-border rounded-2xl bg-background">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-foreground">{task.title}</h4>
                          <StatusBadge status={task.status} />
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                        {task.deadline && (
                          <span className="text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded">Due: {task.deadline}</span>
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
                    <div className="bg-primary/20 p-2 rounded-lg"><Bot className="w-5 h-5 text-primary" /></div>
                    <h3 className="font-bold text-foreground">Study Assistant</h3>
                  </div>
                  
                  <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatHistory.map((msg, i) => (
                      <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-foreground'}`}>
                          {msg.role === 'user' ? <UserIcon className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </div>
                        <div className={`p-3 rounded-2xl max-w-[80%] text-sm ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-none' : 'bg-secondary text-foreground rounded-tl-none'}`}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {chatMutation.isPending && (
                      <div className="flex gap-3">
                        <div className="w-8 h-8 rounded-full bg-secondary text-foreground flex items-center justify-center"><Bot className="w-4 h-4" /></div>
                        <div className="p-3 rounded-2xl bg-secondary text-foreground rounded-tl-none flex gap-1">
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
                          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-4 border-t border-border bg-background">
                    <form onSubmit={handleSendMessage} className="flex gap-2">
                      <input
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Ask about the lecture..."
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
