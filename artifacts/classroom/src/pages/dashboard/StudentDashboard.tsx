import { useState, useRef, useEffect, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import {
  useGetLectures,
  useGetTasks,
  useChat,
  getGetTasksQueryKey,
  getGetLecturesQueryKey,
} from "@workspace/api-client-react";
import type { Task, Lecture } from "@workspace/api-client-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import {
  BookOpen,
  CheckCircle,
  Calendar,
  FileText,
  ListTodo,
  Bot,
  User as UserIcon,
  Send,
  Clock,
  ChevronRight,
  MessageCircle,
  X,
  GraduationCap,
  Target,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

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

export default function StudentDashboard() {
  const { firebaseUser, dbUser } = useAuth();
  const queryClient = useQueryClient();

  // ── Data fetching ───────────────────────────────────────────────
  const lecturesParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: lectures = [], isLoading: loadingLectures } = useGetLectures(
    lecturesParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetLecturesQueryKey(lecturesParams) } }
  );

  const tasksParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: tasks = [], isLoading: loadingTasks } = useGetTasks(
    tasksParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetTasksQueryKey(tasksParams) } }
  );

  const activeTasks = tasks.filter((t: Task) => t.status === "approved");
  const completedTasks = tasks.filter((t: Task) => t.status === "completed");

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

  // ── Chat state ─────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; content: string }[]>([
    { role: "ai", content: "Hi! I'm your AI Study Assistant. How can I help you today? 🎓" },
  ]);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const chatMutation = useChat();

  useEffect(() => {
    if (chatScrollRef.current) chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [chatHistory]);

  const handleSendChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !firebaseUser) return;
    const msg = chatMessage;
    setChatMessage("");
    setChatHistory((prev) => [...prev, { role: "user", content: msg }]);
    try {
      // For general dashboard chat, we might not have a specific lectureId
      // In a real app, you'd either select a context or use a global one
      const res = await chatMutation.mutateAsync({
        data: { message: msg, firebaseUid: firebaseUser.uid, lectureId: 0 },
      });
      setChatHistory((prev) => [...prev, { role: "ai", content: res.answer }]);
    } catch {
      setChatHistory((prev) => [...prev, { role: "ai", content: "Sorry, I couldn't process that. Try again." }]);
    }
  };

  if (loadingLectures || loadingTasks) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
      </div>
    );
  }

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
            Your AI-powered study hub. Review your lectures, track assignments, and chat with your personal tutor.
          </p>
        </motion.div>

        {/* ──── STATS ROW ───────────────────────────────────────── */}
        <motion.div variants={stagger} initial="initial" animate="animate" className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: BookOpen, label: "Lectures", value: lectures.length, iconBg: "bg-primary/10", iconColor: "text-primary", link: "/dashboard/student/lectures" },
            { icon: Target, label: "Tasks Due", value: activeTasks.length, iconBg: "bg-amber-500/10", iconColor: "text-amber-500", link: "/dashboard/student/tasks" },
            { icon: CheckCircle, label: "Completed", value: completedTasks.length, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500", link: "/dashboard/student/tasks" },
            { icon: Calendar, label: "Deadlines", value: upcomingDeadlines.length, iconBg: "bg-violet-500/10", iconColor: "text-violet-500", link: "/dashboard/student/calendar" },
          ].map((stat) => (
            <Link key={stat.label} href={stat.link}>
              <motion.div variants={fadeUp} className="bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className={`${stat.iconBg} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
                    <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{stat.label}</p>
                    <p className="text-2xl font-display font-bold text-foreground">{stat.value}</p>
                  </div>
                </div>
              </motion.div>
            </Link>
          ))}
        </motion.div>

        {/* ──── MAIN GRID ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Recent Lectures */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <FileText className="w-6 h-6 text-primary" /> Recent Lectures
              </h2>
              <Link href="/dashboard/student/lectures" className="text-sm font-bold text-primary hover:underline">
                View Library
              </Link>
            </div>

            <div className="grid gap-4">
              {lectures.slice(0, 3).map((lecture: Lecture) => (
                <Link key={lecture.id} href={`/lectures/${lecture.id}`}>
                  <motion.div
                    {...fadeUp}
                    className="bg-card border border-border rounded-2xl p-5 hover:shadow-lg hover:border-primary/20 transition-all group flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-secondary p-3 rounded-xl group-hover:bg-primary/10 transition-colors">
                        <BookOpen className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                      </div>
                      <div>
                        <h3 className="font-bold text-foreground group-hover:text-primary transition-colors">{lecture.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1">Transcribed {format(new Date(lecture.createdAt), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-all group-hover:translate-x-1" />
                  </motion.div>
                </Link>
              ))}
              {lectures.length === 0 && (
                <div className="bg-secondary/30 border border-dashed border-border rounded-2xl p-12 text-center text-muted-foreground">
                  No lectures found.
                </div>
              )}
            </div>
          </div>

          {/* Urgent Deadlines */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground flex items-center gap-2">
                <Clock className="w-6 h-6 text-amber-500" /> Priorities
              </h2>
              <Link href="/dashboard/student/tasks" className="text-sm font-bold text-primary hover:underline">
                Task Hub
              </Link>
            </div>

            <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-sm">
              {upcomingDeadlines.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">
                  <CheckCircle className="w-10 h-10 text-emerald-500/20 mx-auto mb-3" />
                  <p className="text-sm">No urgent tasks!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {upcomingDeadlines.slice(0, 5).map((task: Task) => {
                    const urgency = deadlineUrgency(task.deadline!);
                    return (
                      <div key={task.id} className="p-4 flex items-start gap-3 hover:bg-secondary/50 transition-colors cursor-default">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${urgency.dot}`} />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-sm text-foreground truncate">{task.title}</h4>
                          <p className={`text-[10px] font-bold mt-0.5 ${urgency.color.split(' ')[0]}`}>{urgency.label}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating AI Chatbot */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        <AnimatePresence>
          {chatOpen && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="w-[380px] h-[500px] bg-card border border-border rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-gradient-to-r from-primary/10 to-violet-500/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Bot className="w-5 h-5 text-primary" />
                  <h3 className="font-bold text-sm">Study Assistant</h3>
                </div>
                <button onClick={() => setChatOpen(false)} className="p-1.5 rounded-lg hover:bg-secondary">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.map((msg, i) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
                    <div className={`p-3 rounded-2xl max-w-[85%] text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-none" : "bg-secondary text-foreground rounded-tl-none"}`}>
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-4 border-t border-border bg-background">
                <form onSubmit={handleSendChat} className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Ask your assistant..."
                    className="flex-1 px-4 py-2 bg-secondary border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button type="submit" className="p-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-sm">
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className={`p-4 rounded-2xl shadow-xl hover:scale-105 active:scale-95 transition-all ${chatOpen ? "bg-secondary text-foreground" : "bg-primary text-white shadow-primary/30"}`}
        >
          {chatOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
}

const Loader2 = ({ className }: { className?: string }) => (
  <Clock className={className} /> // Workaround for icon name if Loader2 isn't available, but it usually is from lucide-react
);
