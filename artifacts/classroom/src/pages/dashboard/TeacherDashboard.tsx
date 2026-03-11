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

  const { data: lectures = [], isLoading: loadingLectures } = useGetLectures(
    { firebaseUid: firebaseUser?.uid || "" },
    { query: { enabled: !!firebaseUser?.uid } }
  );

  const { data: tasks = [], isLoading: loadingTasks } = useGetTasks(
    { firebaseUid: firebaseUser?.uid || "" },
    { query: { enabled: !!firebaseUser?.uid } }
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

        {/* Stats Row */}
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
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Lectures List */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-display font-bold text-foreground">Your Lectures</h2>
              <button
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-md shadow-primary/20"
              >
                <Plus className="w-4 h-4" /> New Lecture
              </button>
            </div>

            {lectures.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground">No lectures yet</h3>
                <p className="text-muted-foreground mt-1">Create your first lecture to get started.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {lectures.map((lecture) => (
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
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {format(new Date(lecture.createdAt), "MMM d, yyyy")}
                      </p>
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
              </div>
            )}
          </div>

          {/* Pending Tasks Panel */}
          <div className="space-y-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Tasks to Approve</h2>
            
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {pendingTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <Check className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">All caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {pendingTasks.map((task) => {
                    const lecture = lectures.find(l => l.id === task.lectureId);
                    return (
                      <div key={task.id} className="p-5">
                        <p className="text-xs font-semibold text-primary mb-1">{lecture?.title}</p>
                        <h4 className="font-medium text-foreground">{task.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-4 line-clamp-2">{task.description}</p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleApprove(task.id)}
                            className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors text-sm"
                          >
                            <Check className="w-4 h-4" /> Approve
                          </button>
                          <button
                            onClick={() => handleReject(task.id)}
                            className="flex-1 flex justify-center items-center gap-1.5 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors text-sm"
                          >
                            <X className="w-4 h-4" /> Reject
                          </button>
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

      <CreateLectureModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
