import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import {
  useGetLectures,
  useGetLecture,
  useGetTasks,
  useCompleteTask,
  useChat,
  getGetTasksQueryKey,
} from "@workspace/api-client-react";
import type { Task, Lecture } from "@workspace/api-client-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import {
  BookOpen,
  CheckCircle,
  Calendar,
  FileText,
  Mic,
  ListTodo,
  Bot,
  User as UserIcon,
  Send,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  X,
  Sparkles,
  GraduationCap,
  Target,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

// ─── Helper: urgency color for deadlines ────────────────────────────
function deadlineUrgency(deadlineStr: string) {
  try {
    const days = differenceInCalendarDays(parseISO(deadlineStr), new Date());
    if (days < 0) return { label: "Overdue", color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500" };
    if (days <= 2) return { label: `${days}d left`, color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500" };
    if (days <= 7) return { label: `${days}d left`, color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-500" };
    return { label: `${days}d left`, color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" };
  } catch {
    return { label: "No date", color: "text-muted-foreground bg-secondary border-border", dot: "bg-muted-foreground" };
  }
}

// ─── Animations ─────────────────────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function StudentDashboard() {
  const { firebaseUser, dbUser } = useAuth();
  const queryClient = useQueryClient();

  // ── Data fetching ───────────────────────────────────────────────
  const { data: lectures = [], isLoading: loadingLectures } = useGetLectures(
    { firebaseUid: firebaseUser?.uid || "" },
    { query: { enabled: !!firebaseUser?.uid } }
  );

  const { data: tasks = [], isLoading: loadingTasks } = useGetTasks(
    { firebaseUid: firebaseUser?.uid || "" },
    { query: { enabled: !!firebaseUser?.uid } }
  );

  const completeMutation = useCompleteTask();

  // ── Selected lecture detail (for transcript + summary) ─────────
  const [selectedLectureId, setSelectedLectureId] = useState<number | null>(null);
  const { data: lectureDetail } = useGetLecture(selectedLectureId ?? 0, {
    query: { enabled: !!selectedLectureId },
  });

  // ── Task tabs ──────────────────────────────────────────────────
  const [taskTab, setTaskTab] = useState<"todo" | "completed">("todo");
  const activeTasks = tasks.filter((t: Task) => t.status === "approved");
  const completedTasks = tasks.filter((t: Task) => t.status === "completed");

  // ── Upcoming deadlines ─────────────────────────────────────────
  const upcomingDeadlines = useMemo(() => {
    return tasks
      .filter((t: Task) => t.deadline && t.status !== "completed" && t.status !== "rejected")
      .sort((a: Task, b: Task) => {
        try {
          return parseISO(a.deadline!).getTime() - parseISO(b.deadline!).getTime();
        } catch {
          return 0;
        }
      });
  }, [tasks]);

  // ── Transcript expand toggle ───────────────────────────────────
  const [transcriptExpanded, setTranscriptExpanded] = useState(false);

  // ── Chat state ─────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! Select a lecture and ask me anything about it 🎓" },
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = useChat();

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory]);

  // When a new lecture is selected, reset chat
  useEffect(() => {
    if (selectedLectureId) {
      const lec = lectures.find((l: Lecture) => l.id === selectedLectureId);
      setChatHistory([
        { role: "ai", content: `I'm ready to help with "${lec?.title ?? "this lecture"}". Ask me anything!` },
      ]);
    }
  }, [selectedLectureId, lectures]);

  // ── Handlers ──────────────────────────────────────────────────
  const handleCompleteTask = async (id: number) => {
    await completeMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
  };

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !firebaseUser || !selectedLectureId) return;
    const msg = chatMessage;
    setChatMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: msg }]);
    try {
      const res = await chatMutation.mutateAsync({
        data: { lectureId: selectedLectureId, message: msg, firebaseUid: firebaseUser.uid },
      });
      setChatHistory((prev) => [...prev, { role: "ai", content: res.answer }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "ai", content: "Sorry, I couldn't process that. Try again." }]);
    }
  };

  // ── Loading state ──────────────────────────────────────────────
  if (loadingLectures || loadingTasks) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
          <p className="text-muted-foreground text-sm font-medium">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-10">
        {/* ──── WELCOME HEADER ──────────────────────────────────── */}
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/10 p-8">
          <div className="absolute top-4 right-6 opacity-10">
            <GraduationCap className="w-24 h-24 text-primary" />
          </div>
          <h1 className="text-4xl font-display font-bold text-foreground">
            Welcome back, {dbUser?.displayName?.split(" ")[0] || "Student"} 👋
          </h1>
          <p className="text-muted-foreground mt-2 text-lg max-w-xl">
            Your learning hub — summaries, transcripts, tasks, and AI assistance all in one place.
          </p>
        </motion.div>

        {/* ──── STATS ROW ───────────────────────────────────────── */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, label: "Lectures", value: lectures.length, iconBg: "bg-primary/10", iconColor: "text-primary" },
            { icon: Target, label: "Tasks Due", value: activeTasks.length, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
            { icon: CheckCircle, label: "Completed", value: completedTasks.length, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
            { icon: AlertTriangle, label: "Upcoming", value: upcomingDeadlines.length, iconBg: "bg-violet-500/10", iconColor: "text-violet-500" },
          ].map((stat) => (
            <motion.div key={stat.label} variants={fadeUp} className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3">
                <div className={`${stat.iconBg} p-3 rounded-xl`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                  <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* ──── MAIN GRID: Lectures + Tasks / Deadlines ─────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ════════ LEFT COLUMN: Lecture Summaries + Detail ════════ */}
          <div className="lg:col-span-2 space-y-8">

            {/* SECTION 1 — Lecture Summaries */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <h2 className="text-2xl font-display font-bold text-foreground">Lecture Summaries</h2>
              </div>

              {lectures.length === 0 ? (
                <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <p className="text-muted-foreground">No lectures available yet.</p>
                </div>
              ) : (
                <div className="grid gap-4">
                  {lectures.map((lecture: Lecture) => {
                    const isSelected = selectedLectureId === lecture.id;
                    return (
                      <motion.button
                        key={lecture.id}
                        layout
                        onClick={() => setSelectedLectureId(isSelected ? null : lecture.id)}
                        className={`w-full text-left bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md transition-all group ${isSelected ? "border-primary/40 ring-2 ring-primary/20" : "border-border"
                          }`}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-1.5">
                              <h3 className="text-lg font-bold text-foreground truncate">{lecture.title}</h3>
                              {lecture.status === "done" && <StatusBadge status="completed" />}
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{lecture.description}</p>
                            <p className="text-xs text-muted-foreground font-medium">
                              {format(new Date(lecture.createdAt), "MMMM d, yyyy")}
                            </p>
                          </div>
                          <div className={`p-2 rounded-xl transition-colors ${isSelected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"}`}>
                            {isSelected ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* SECTION 1b — Selected Lecture AI Summary */}
            <AnimatePresence mode="wait">
              {selectedLectureId && lectureDetail && lectureDetail.status === "done" && (
                <motion.section
                  key={`summary-${selectedLectureId}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-gradient-to-br from-primary/20 to-violet-500/20 p-2 rounded-xl">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-display font-bold text-foreground">AI Summary</h2>
                      <span className="ml-auto text-xs text-muted-foreground bg-secondary px-3 py-1 rounded-full font-medium">
                        {lectureDetail.title}
                      </span>
                    </div>
                    <div className="prose prose-blue max-w-none text-foreground/90 leading-relaxed whitespace-pre-wrap text-sm">
                      {lectureDetail.summary || "No summary available for this lecture."}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>

            {/* SECTION 2 — Full Transcript Viewer */}
            <AnimatePresence mode="wait">
              {selectedLectureId && lectureDetail && lectureDetail.status === "done" && (
                <motion.section
                  key={`transcript-${selectedLectureId}`}
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut", delay: 0.1 }}
                  className="overflow-hidden"
                >
                  <div className="bg-card border border-border rounded-3xl p-8 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="bg-secondary p-2 rounded-xl">
                        <Mic className="w-5 h-5 text-foreground" />
                      </div>
                      <h2 className="text-xl font-display font-bold text-foreground">Full Transcript</h2>
                      <button
                        onClick={() => setTranscriptExpanded(!transcriptExpanded)}
                        className="ml-auto flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium bg-primary/5 hover:bg-primary/10 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {transcriptExpanded ? (
                          <>
                            <ChevronUp className="w-3 h-3" /> Collapse
                          </>
                        ) : (
                          <>
                            <ChevronDown className="w-3 h-3" /> Expand
                          </>
                        )}
                      </button>
                    </div>
                    <div
                      className={`bg-secondary/30 p-6 rounded-2xl overflow-y-auto font-mono text-sm leading-relaxed text-muted-foreground whitespace-pre-wrap border border-border/50 transition-all duration-300 ${transcriptExpanded ? "max-h-[800px]" : "max-h-[250px]"
                        }`}
                    >
                      {lectureDetail.transcript || "No transcript available for this lecture."}
                    </div>
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>

          {/* ════════ RIGHT COLUMN: Tasks + Deadlines ════════════── */}
          <div className="lg:col-span-1 space-y-8">

            {/* SECTION 3 — Task List with Tabs */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-amber-500/10 p-2 rounded-xl">
                  <ListTodo className="w-5 h-5 text-amber-600" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">Task List</h2>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 bg-secondary/60 p-1 rounded-xl mb-4">
                <button
                  onClick={() => setTaskTab("todo")}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${taskTab === "todo"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  To Do ({activeTasks.length})
                </button>
                <button
                  onClick={() => setTaskTab("completed")}
                  className={`flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-all ${taskTab === "completed"
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  Done ({completedTasks.length})
                </button>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                <AnimatePresence mode="wait">
                  {taskTab === "todo" ? (
                    <motion.div key="todo" {...fadeUp} className="divide-y divide-border">
                      {activeTasks.length === 0 ? (
                        <div className="p-8 text-center">
                          <CheckCircle className="w-10 h-10 text-emerald-500/40 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">All caught up! 🎉</p>
                        </div>
                      ) : (
                        activeTasks.map((task: Task) => {
                          const lecture = lectures.find((l: Lecture) => l.id === task.lectureId);
                          return (
                            <div key={task.id} className="p-4 hover:bg-secondary/30 transition-colors">
                              <p className="text-xs font-semibold text-primary mb-1 truncate">{lecture?.title}</p>
                              <h4 className="font-semibold text-foreground text-sm">{task.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 mb-3 line-clamp-2">{task.description}</p>
                              {task.deadline && (
                                <div className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg border mb-3 ${deadlineUrgency(task.deadline).color}`}>
                                  <Calendar className="w-3 h-3" /> {task.deadline}
                                </div>
                              )}
                              <button
                                onClick={() => handleCompleteTask(task.id)}
                                disabled={completeMutation.isPending}
                                className="w-full flex justify-center items-center gap-2 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-sm font-medium transition-all shadow-sm shadow-primary/20 disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" /> Mark Complete
                              </button>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="completed" {...fadeUp} className="divide-y divide-border">
                      {completedTasks.length === 0 ? (
                        <div className="p-8 text-center">
                          <ListTodo className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                          <p className="text-muted-foreground text-sm">No completed tasks yet.</p>
                        </div>
                      ) : (
                        completedTasks.map((task: Task) => {
                          const lecture = lectures.find((l: Lecture) => l.id === task.lectureId);
                          return (
                            <div key={task.id} className="p-4 opacity-70">
                              <p className="text-xs font-semibold text-primary/70 mb-1 truncate">{lecture?.title}</p>
                              <h4 className="font-semibold text-foreground text-sm line-through">{task.title}</h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{task.description}</p>
                            </div>
                          );
                        })
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </section>

            {/* SECTION 4 — Upcoming Deadlines */}
            <section>
              <div className="flex items-center gap-3 mb-5">
                <div className="bg-violet-500/10 p-2 rounded-xl">
                  <Clock className="w-5 h-5 text-violet-600" />
                </div>
                <h2 className="text-xl font-display font-bold text-foreground">Upcoming Deadlines</h2>
              </div>

              <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                {upcomingDeadlines.length === 0 ? (
                  <div className="p-8 text-center">
                    <Calendar className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">No upcoming deadlines</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {upcomingDeadlines.slice(0, 8).map((task: Task) => {
                      const urgency = deadlineUrgency(task.deadline!);
                      const lecture = lectures.find((l: Lecture) => l.id === task.lectureId);
                      return (
                        <div key={task.id} className="p-4 flex items-start gap-3 hover:bg-secondary/30 transition-colors">
                          <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${urgency.dot}`} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground text-sm truncate">{task.title}</h4>
                            <p className="text-xs text-muted-foreground truncate">{lecture?.title}</p>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-lg border shrink-0 ${urgency.color}`}>
                            {urgency.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ════════ SECTION 5 — Floating AI Chatbot ══════════════════ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-[380px] max-h-[520px] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Chat Header */}
              <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-violet-500/10 flex items-center gap-3">
                <div className="bg-primary/20 p-2 rounded-xl">
                  <Bot className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground text-sm">Study Assistant</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedLectureId
                      ? `Discussing: ${lectures.find((l: Lecture) => l.id === selectedLectureId)?.title ?? "Lecture"}`
                      : "Select a lecture first"}
                  </p>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary text-muted-foreground transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px]">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                        }`}
                    >
                      {msg.role === "user" ? <UserIcon className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                    </div>
                    <div
                      className={`p-3 rounded-2xl max-w-[80%] text-sm leading-relaxed ${msg.role === "user"
                          ? "bg-primary text-primary-foreground rounded-tr-sm"
                          : "bg-secondary text-foreground rounded-tl-sm"
                        }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
                {chatMutation.isPending && (
                  <div className="flex gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-secondary text-foreground flex items-center justify-center">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div className="p-3 rounded-2xl bg-secondary text-foreground rounded-tl-sm flex gap-1.5 items-center">
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                      <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-3 border-t border-border bg-background">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder={selectedLectureId ? "Ask about this lecture…" : "Select a lecture first"}
                    disabled={chatMutation.isPending || !selectedLectureId}
                    className="flex-1 px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 placeholder:text-muted-foreground/60"
                  />
                  <button
                    type="submit"
                    disabled={chatMutation.isPending || !chatMessage.trim() || !selectedLectureId}
                    className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-40 transition-colors shadow-sm"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB Toggle */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`p-4 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95 ${chatOpen
              ? "bg-secondary text-foreground shadow-md"
              : "bg-gradient-to-br from-primary to-violet-600 text-white shadow-xl shadow-primary/30"
            }`}
        >
          {chatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}
