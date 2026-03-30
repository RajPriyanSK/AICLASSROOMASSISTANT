import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { AudioRecorder } from "@/components/AudioRecorder";
import { 
  useCreateLecture, 
  useGetUploadUrl, 
  useProcessLecture, 
  useGetLectures,
  getGetLecturesQueryKey 
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Mic, Radio, Loader2, Plus, ChevronRight, History, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Link } from "wouter";

export default function Recording() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeLectureId, setActiveLectureId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");

  const createMutation = useCreateLecture();
  const uploadUrlMutation = useGetUploadUrl();
  const processMutation = useProcessLecture();

  const lecturesParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: lectures = [] } = useGetLectures(
    lecturesParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetLecturesQueryKey(lecturesParams) } }
  );

  const pendingLectures = lectures.filter(l => l.status === "pending");

  const handleCreateAndSelect = async () => {
    if (!newTitle.trim() || !firebaseUser) return;
    try {
      const lecture = await createMutation.mutateAsync({
        data: {
          title: newTitle,
          teacherUid: firebaseUser.uid,
          description: `Recorded on ${format(new Date(), "MMMM d, yyyy HH:mm")}`
        }
      });
      setActiveLectureId(lecture.id);
      setIsCreating(false);
      setNewTitle("");
      queryClient.invalidateQueries({ queryKey: getGetLecturesQueryKey() });
      toast({ title: "Lecture created", description: "You can now start recording." });
    } catch {
      toast({ title: "Failed to create", variant: "destructive" });
    }
  };

  const getUploadUrlAndProcess = async (blob: Blob, fileName: string, contentType: string): Promise<string> => {
    if (!activeLectureId) throw new Error("No active lecture");
    const { uploadUrl, publicUrl } = await uploadUrlMutation.mutateAsync({
      id: activeLectureId,
      data: { fileName, contentType },
    });

    await fetch(uploadUrl, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": contentType },
    });

    return publicUrl;
  };

  const handleUploadSuccess = async (audioUrl: string) => {
    if (!activeLectureId) return;
    try {
      await processMutation.mutateAsync({ id: activeLectureId, data: { audioUrl } });
      toast({ title: "Recording uploaded", description: "AI is now processing the lecture." });
      setActiveLectureId(null);
      queryClient.invalidateQueries({ queryKey: getGetLecturesQueryKey() });
    } catch {
      toast({ title: "Processing failed", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <div className="bg-red-500/10 p-2 rounded-2xl">
                <Mic className="w-8 h-8 text-red-600" />
              </div>
              Recording Studio
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              {activeLectureId 
                ? `Currently recording for: ${lectures.find(l => l.id === activeLectureId)?.title}`
                : "Select or create a lecture to start recording."}
            </p>
          </div>

          {!activeLectureId && (
            <button
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
            >
              <Plus className="w-5 h-5" /> Quick Lecture
            </button>
          )}
        </div>

        <AnimatePresence mode="wait">
          {isCreating ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-xl mb-12"
            >
              <h3 className="text-xl font-bold mb-4">Give your lecture a title</h3>
              <div className="flex gap-4">
                <input
                  autoFocus
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g., Biology 101 - Cell Structure"
                  className="flex-1 bg-secondary border border-border rounded-xl px-4 py-3 text-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateAndSelect()}
                />
                <button
                  onClick={handleCreateAndSelect}
                  disabled={!newTitle.trim() || createMutation.isPending}
                  className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-bold disabled:opacity-50 flex items-center gap-2"
                >
                  {createMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                  Create
                </button>
              </div>
              <button 
                onClick={() => setIsCreating(false)}
                className="mt-4 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
            </motion.div>
          ) : activeLectureId ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="flex items-center justify-between bg-red-50 border border-red-100 p-4 rounded-2xl">
                <div className="flex items-center gap-3 text-red-700 font-bold">
                  <Radio className="w-5 h-5 animate-pulse" />
                  Recording Active: {lectures.find(l => l.id === activeLectureId)?.title}
                </div>
                <button 
                  onClick={() => setActiveLectureId(null)}
                  className="text-sm text-red-600 hover:underline font-medium"
                >
                  Switch lecture
                </button>
              </div>
              
              <AudioRecorder
                lectureId={activeLectureId}
                uploadFn={getUploadUrlAndProcess}
                onUploadSuccess={handleUploadSuccess}
              />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-8"
            >
              {/* Pending Selection */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" /> Pending Lectures
                </h2>
                <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
                  {pendingLectures.length === 0 ? (
                    <div className="p-12 text-center text-muted-foreground">
                      <p>No lectures awaiting audio.</p>
                      <button 
                        onClick={() => setIsCreating(true)}
                        className="text-primary font-medium mt-1 hover:underline"
                      >
                        Create one now
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {pendingLectures.map(lecture => (
                        <button
                          key={lecture.id}
                          onClick={() => setActiveLectureId(lecture.id)}
                          className="w-full p-5 text-left hover:bg-secondary/50 transition-colors flex items-center justify-between group"
                        >
                          <div>
                            <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{lecture.title}</h4>
                            <p className="text-xs text-muted-foreground mt-1">Created {format(new Date(lecture.createdAt), "MMM d, h:mm a")}</p>
                          </div>
                          <div className="p-2 bg-secondary rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                            <Play className="w-4 h-4 fill-current" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Tips Section */}
              <div className="space-y-4">
                <h2 className="text-xl font-bold">Quick Tips</h2>
                <div className="grid gap-4">
                  <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-3xl">
                    <h4 className="font-bold text-indigo-900 mb-1">Clear Audio</h4>
                    <p className="text-sm text-indigo-700">Position your microphone close to you for better AI transcription accuracy.</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-3xl">
                    <h4 className="font-bold text-emerald-900 mb-1">Auto-Tagging</h4>
                    <p className="text-sm text-emerald-700">AI will automatically detect chapter marks and key topics during processing.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
