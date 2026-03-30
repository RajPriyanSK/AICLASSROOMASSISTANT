import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useGetLectures, 
  useGetTasks, 
  useDeleteLecture,
  useApproveTask,
  useRejectTask,
  getGetLecturesQueryKey,
  getGetTasksQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { StatusBadge } from "@/components/StatusBadge";
import { CreateLectureModal } from "@/components/CreateLectureModal";
import { Plus, BookOpen, Clock, Users, Trash2, Check, X, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function TeacherDashboard() {
  const { firebaseUser, dbUser } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const queryClient = useQueryClient();

  const lecturesParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: lectures = [], isLoading: loadingLectures } = useGetLectures(
    lecturesParams,
    { 
      query: { 
        enabled: !!firebaseUser?.uid,
        queryKey: getGetLecturesQueryKey(lecturesParams)
      } 
    }
  );

  const tasksParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: tasks = [], isLoading: loadingTasks } = useGetTasks(
    tasksParams,
    { 
      query: { 
        enabled: !!firebaseUser?.uid,
        queryKey: getGetTasksQueryKey(tasksParams)
      } 
    }
  );

  const deleteMutation = useDeleteLecture();
  const approveMutation = useApproveTask();
  const rejectMutation = useRejectTask();

  const pendingTasks = tasks.filter(t => t.status === "pending");

  const handleDeleteLecture = async (id: number) => {
    if (confirm("Are you sure you want to delete this lecture?")) {
      await deleteMutation.mutateAsync({ id });
      queryClient.invalidateQueries({ queryKey: getGetLecturesQueryKey() });
    }
  };

  const handleApprove = async (id: number) => {
    await approveMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
  };

  const handleReject = async (id: number) => {
    await rejectMutation.mutateAsync({ id });
    queryClient.invalidateQueries({ queryKey: getGetTasksQueryKey() });
  };

  if (loadingLectures || loadingTasks) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      <Navbar />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <h1 className="text-4xl font-display font-bold text-foreground">
            Welcome, Dr. {dbUser?.displayName?.split(' ')[0] || 'Teacher'}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Here's what's happening in your classroom today.</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-2xl text-primary"><BookOpen className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Lectures</p>
                <p className="text-3xl font-display font-bold text-foreground">{lectures.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-4 rounded-2xl text-amber-500"><Clock className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Approvals</p>
                <p className="text-3xl font-display font-bold text-foreground">{pendingTasks.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-500"><Check className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Tasks</p>
                <p className="text-3xl font-display font-bold text-foreground">{tasks.length - pendingTasks.length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lectures List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground">Recently Records</h2>
              <Link
                href="/dashboard/teacher/recording"
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4" /> New Record
              </Link>
            </div>

            {lectures.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">No lectures yet</h3>
                <p className="text-muted-foreground mt-1">Create your first lecture to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {lectures.slice(0, 5).map((lecture) => (
                  <motion.div
                    key={lecture.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="group bg-card rounded-2xl p-5 border border-border shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-foreground">{lecture.title}</h3>
                        <StatusBadge status={lecture.status} />
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{lecture.description || 'No description'}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <p className="text-xs text-muted-foreground font-medium">
                          {format(new Date(lecture.createdAt), "MMM d, yyyy")}
                        </p>
                        <span className="w-1 h-1 bg-border rounded-full" />
                        <p className="text-xs text-muted-foreground font-medium">
                          {lecture.status === 'done' ? 'Processed' : 'Awaiting sync'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/lectures/${lecture.id}`} className="px-4 py-2 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2">
                        View <ArrowRight className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => handleDeleteLecture(lecture.id)}
                        className="p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
                {lectures.length > 5 && (
                  <button className="text-center w-full py-2 text-sm font-medium text-primary hover:underline">
                    View all lectures
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Pending Tasks Panel */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground">Approvals</h2>
              {pendingTasks.length > 0 && (
                <span className="bg-amber-500 text-white text-xs font-bold px-2 py-1 rounded-full animate-pulse">
                  {pendingTasks.length} New
                </span>
              )}
            </div>
            
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {pendingTasks.length === 0 ? (
                <div className="p-12 text-center bg-emerald-50/30">
                  <div className="bg-emerald-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Check className="w-6 h-6 text-emerald-600" />
                  </div>
                  <h4 className="font-bold text-foreground">Zero pending</h4>
                  <p className="text-sm text-muted-foreground mt-1">You've cleared all extractions.</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                  {pendingTasks.map((task) => {
                    const lecture = lectures.find(l => l.id === task.lectureId);
                    return (
                      <motion.div 
                        key={task.id} 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="p-5"
                      >
                        <p className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1">{lecture?.title}</p>
                        <h4 className="font-bold text-foreground line-clamp-1">{task.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-4 line-clamp-2">{task.description}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(task.id)}
                            className="flex-1 flex justify-center items-center gap-1.5 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-bold transition-all text-xs"
                          >
                            <Check className="w-3.5 h-3.5" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(task.id)}
                            className="p-2.5 bg-secondary text-foreground hover:bg-destructive/10 hover:text-destructive rounded-xl transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quick Tips or Stats */}
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
              <h4 className="font-bold mb-2">Pro Tip</h4>
              <p className="text-sm opacity-90 leading-relaxed">
                Use the Recording interface for high-quality audio capture. AI processing is 40% faster on direct uploads.
              </p>
            </div>
          </div>
        </div>

      </main>

      <CreateLectureModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
