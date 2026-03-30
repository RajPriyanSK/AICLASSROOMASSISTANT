import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { useGetTasks, useCompleteTask, getGetTasksQueryKey, useGetLectures, getGetLecturesQueryKey } from "@workspace/api-client-react";
import type { Task, Lecture } from "@workspace/api-client-react";
import { format, differenceInCalendarDays, parseISO } from "date-fns";
import { CheckCircle, ListTodo, Calendar, Clock, AlertCircle, BookOpen, ChevronRight, LayoutList } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

function deadlineUrgency(deadlineStr: string) {
  try {
    const days = differenceInCalendarDays(parseISO(deadlineStr), new Date());
    if (days < 0) return { label: "Overdue", color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500", icon: AlertCircle };
    if (days <= 2) return { label: `${days}d left`, color: "text-red-600 bg-red-50 border-red-200", dot: "bg-red-500", icon: Clock };
    if (days <= 7) return { label: `${days}d left`, color: "text-amber-600 bg-amber-50 border-amber-200", dot: "bg-amber-500", icon: Clock };
    return { label: `${days}d left`, color: "text-emerald-600 bg-emerald-50 border-emerald-200", dot: "bg-emerald-500", icon: Calendar };
  } catch {
    return { label: "No date", color: "text-muted-foreground bg-secondary border-border", dot: "bg-muted-foreground", icon: Calendar };
  }
}

export default function StudentTasks() {
  const { firebaseUser } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"pending" | "completed">("pending");

  const tasksParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: tasks = [], isLoading } = useGetTasks(
    tasksParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetTasksQueryKey(tasksParams) } }
  );

  const lecturesParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: lectures = [] } = useGetLectures(
    lecturesParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetLecturesQueryKey(lecturesParams) } }
  );

  const completeMutation = useCompleteTask();

  const handleComplete = async (id: number) => {
    try {
      await completeMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey(tasksParams) });
      toast({ title: "Task completed!", description: "Great work on finishing your assignment." });
    } catch {
      toast({ title: "Failed to update", variant: "destructive" });
    }
  };

  const pendingTasks = tasks.filter(t => t.status === "approved").sort((a, b) => {
    if (!a.deadline) return 1;
    if (!b.deadline) return -1;
    return parseISO(a.deadline).getTime() - parseISO(b.deadline).getTime();
  });

  const completedTasks = tasks.filter(t => t.status === "completed");

  const displayTasks = activeTab === "pending" ? pendingTasks : completedTasks;

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3 text-foreground">
              <div className="bg-amber-500/10 p-2.5 rounded-2xl">
                <LayoutList className="w-8 h-8 text-amber-600" />
              </div>
              Assignments Hub
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage your AI-extracted tasks and track your academic progress.
            </p>
          </div>

          <div className="bg-secondary/50 p-1.5 rounded-2xl flex items-center gap-2 border border-border/50">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "pending" ? "bg-card text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
            >
              Pending ({pendingTasks.length})
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "completed" ? "bg-card text-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"}`}
            >
              Completed ({completedTasks.length})
            </button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-card border border-border rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : displayTasks.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-[2.5rem] p-20 text-center">
            {activeTab === "pending" ? (
              <>
                <div className="bg-emerald-500/10 p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-emerald-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground">All caught up!</h3>
                <p className="text-muted-foreground mt-1">You have no pending assignments at the moment.</p>
              </>
            ) : (
              <>
                <div className="bg-secondary p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                  <ListTodo className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <h3 className="text-xl font-bold text-foreground">No completed tasks yet</h3>
                <p className="text-muted-foreground mt-1">Finish your first assignment to see it here!</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            <AnimatePresence mode="popLayout">
              {displayTasks.map((task) => {
                const lecture = lectures.find(l => l.id === task.lectureId);
                const urgency = task.deadline ? deadlineUrgency(task.deadline) : null;
                const UrgencyIcon = urgency?.icon || Calendar;

                return (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`bg-card border border-border rounded-3xl p-6 shadow-sm hover:shadow-md transition-all group ${activeTab === 'completed' ? 'opacity-75' : ''}`}
                  >
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                          <button
                            onClick={() => lecture && setLocation(`/lectures/${lecture.id}`)}
                            className="text-xs font-bold text-primary bg-primary/5 px-2.5 py-1 rounded-lg hover:bg-primary hover:text-white transition-all flex items-center gap-1.5"
                          >
                            <BookOpen className="w-3 h-3" />
                            {lecture?.title || "Lecture"}
                            <ChevronRight className="w-3 h-3" />
                          </button>
                        </div>
                        <h3 className={`text-xl font-display font-bold text-foreground mb-2 ${activeTab === 'completed' ? 'line-through' : ''}`}>
                          {task.title}
                        </h3>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          {task.description}
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row md:flex-col items-stretch gap-4 w-full md:w-48 shrink-0">
                        {task.deadline && (
                          <div className={`flex items-center gap-3 p-3 rounded-2xl border ${urgency?.color}`}>
                            <div className={`p-2 rounded-xl bg-white/50 backdrop-blur-sm`}>
                              <UrgencyIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Due Date</p>
                              <p className="text-sm font-bold">{urgency?.label} ({format(parseISO(task.deadline), "MMM d")})</p>
                            </div>
                          </div>
                        )}

                        {activeTab === "pending" && (
                          <button
                            onClick={() => handleComplete(task.id)}
                            disabled={completeMutation.isPending}
                            className="flex items-center justify-center gap-2 w-full py-3 bg-primary text-primary-foreground rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                          >
                            <CheckCircle className="w-5 h-5" />
                            Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
