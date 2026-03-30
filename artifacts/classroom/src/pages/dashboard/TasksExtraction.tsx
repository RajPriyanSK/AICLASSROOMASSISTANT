import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import {
  useGetTasks,
  useApproveTask,
  useRejectTask,
  useGetLectures,
  getGetTasksQueryKey,
  getGetLecturesQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import {
  ListTodo, Search, Filter, Check, X,
  Calendar as CalendarIcon, Loader2, AlertCircle,
  MoreVertical, CheckCircle2, XCircle, Clock
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { Link } from "wouter";
import { StatusBadge } from "@/components/StatusBadge";

export default function TasksExtraction() {
  const { firebaseUser } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const lecturesParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: lectures = [] } = useGetLectures(
    lecturesParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetLecturesQueryKey(lecturesParams) } }
  );

  const tasksParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: tasks = [], isLoading } = useGetTasks(
    tasksParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetTasksQueryKey(tasksParams) } }
  );

  const approveMutation = useApproveTask();
  const rejectMutation = useRejectTask();

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      const matchesSearch = task.title.toLowerCase().includes(search.toLowerCase()) ||
        task.description?.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === "all" || task.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [tasks, search, statusFilter]);

  const handleApprove = async (id: number) => {
    try {
      await approveMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      toast({ title: "Task approved" });
    } catch {
      toast({ title: "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = async (id: number) => {
    try {
      await rejectMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      toast({ title: "Task rejected" });
    } catch {
      toast({ title: "Failed to reject", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <div className="bg-amber-500/10 p-2 rounded-2xl">
                <ListTodo className="w-8 h-8 text-amber-600" />
              </div>
              Tasks Extraction
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Review and manage all AI-generated assignments and deadlines.
            </p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-card border border-border rounded-3xl p-4 mb-8 flex flex-col md:flex-row gap-4 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tasks or descriptions..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-secondary/50 border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground ml-2 mr-1" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-secondary/50 border border-border rounded-2xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none min-w-[140px]"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Results */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-3xl p-20 text-center">
            <AlertCircle className="w-16 h-16 text-muted-foreground/20 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-2">No tasks found</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              {search || statusFilter !== "all"
                ? "Try adjusting your filters or search terms."
                : "No tasks have been extracted from your lectures yet."}
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            <AnimatePresence>
              {filteredTasks.map((task, index) => {
                const lecture = lectures.find(l => l.id === task.lectureId);
                return (
                  <motion.div
                    key={task.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="group bg-card border border-border rounded-3xl p-6 hover:shadow-lg transition-all"
                  >
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <StatusBadge status={task.status} />
                          <span className="text-xs font-bold text-primary uppercase tracking-widest">{lecture?.title || 'Unknown Lecture'}</span>
                        </div>
                        <h3 className="text-2xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">{task.title}</h3>
                        <p className="text-muted-foreground leading-relaxed mb-6">{task.description || 'No description available for this task.'}</p>

                        <div className="flex flex-wrap items-center gap-6">
                          {task.deadline && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-bold border border-amber-100">
                              <CalendarIcon className="w-4 h-4" /> Due: {format(new Date(task.deadline), "PPP")}
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-muted-foreground text-sm">
                            <Clock className="w-4 h-4" /> Created {format(new Date(task.createdAt), "MMM d")}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-row md:flex-col gap-2 shrink-0">
                        {task.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleApprove(task.id)}
                              className="flex-1 md:w-40 flex items-center justify-center gap-2 py-3 px-6 bg-primary text-primary-foreground rounded-2xl font-bold hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
                            >
                              <CheckCircle2 className="w-5 h-5" /> Approve
                            </button>
                            <button
                              onClick={() => handleReject(task.id)}
                              className="flex-1 md:w-40 flex items-center justify-center gap-2 py-3 px-6 bg-secondary text-foreground rounded-2xl font-bold hover:bg-destructive/10 hover:text-destructive transition-all border border-border"
                            >
                              <XCircle className="w-5 h-5" /> Reject
                            </button>
                          </>
                        )}
                        {task.status === "approved" && (
                          <button
                            disabled
                            className="w-full md:w-40 flex items-center justify-center gap-2 py-3 px-6 bg-emerald-100 text-emerald-700 rounded-2xl font-bold opacity-80"
                          >
                            <CheckCircle2 className="w-5 h-5" /> Approved
                          </button>
                        )}
                        {task.status === "rejected" && (
                          <button
                            disabled
                            className="w-full md:w-40 flex items-center justify-center gap-2 py-3 px-6 bg-red-100 text-red-700 rounded-2xl font-bold opacity-80"
                          >
                            <XCircle className="w-5 h-5" /> Rejected
                          </button>
                        )}
                        <Link
                          href={`/lectures/${task.lectureId}`}
                          className="p-3 bg-secondary text-muted-foreground hover:text-foreground rounded-2xl transition-all border border-border flex justify-center"
                          title="View Source Lecture"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </Link>
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
