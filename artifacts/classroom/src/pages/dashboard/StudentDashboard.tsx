import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useGetLectures, 
  useGetTasks, 
  useCompleteTask,
  getGetTasksQueryKey
} from "@workspace/api-client-react";
import { format } from "date-fns";
import { Link } from "wouter";
import { StatusBadge } from "@/components/StatusBadge";
import { BookOpen, CheckCircle, Calendar, ArrowRight } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";

export default function StudentDashboard() {
  const { firebaseUser, dbUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: lectures = [], isLoading: loadingLectures } = useGetLectures(
    { firebaseUid: firebaseUser?.uid || "" },
    { query: { enabled: !!firebaseUser?.uid } }
  );

  const { data: tasks = [], isLoading: loadingTasks } = useGetTasks(
    { firebaseUid: firebaseUser?.uid || "" },
    { query: { enabled: !!firebaseUser?.uid } }
  );

  const completeMutation = useCompleteTask();

  // For students, we only care about tasks that are approved (to do) or completed
  const activeTasks = tasks.filter(t => t.status === "approved");
  const completedTasks = tasks.filter(t => t.status === "completed");

  const handleCompleteTask = async (id: number) => {
    await completeMutation.mutateAsync({ id });
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
            Welcome, {dbUser?.displayName?.split(' ')[0] || 'Student'}
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">Ready to continue learning?</p>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-primary/10 p-4 rounded-2xl text-primary"><BookOpen className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available Lectures</p>
                <p className="text-3xl font-display font-bold text-foreground">{lectures.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-amber-500/10 p-4 rounded-2xl text-amber-500"><Calendar className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Due</p>
                <p className="text-3xl font-display font-bold text-foreground">{activeTasks.length}</p>
              </div>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="bg-card rounded-2xl p-6 border border-border shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500/10 p-4 rounded-2xl text-emerald-500"><CheckCircle className="w-6 h-6" /></div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-3xl font-display font-bold text-foreground">{completedTasks.length}</p>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Tasks Panel */}
          <div className="lg:col-span-1 lg:order-last space-y-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Your Tasks</h2>
            
            <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
              {activeTasks.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
                  <p className="text-muted-foreground">All tasks completed!</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {activeTasks.map((task) => {
                    const lecture = lectures.find(l => l.id === task.lectureId);
                    return (
                      <div key={task.id} className="p-5">
                        <p className="text-xs font-semibold text-primary mb-1">{lecture?.title}</p>
                        <h4 className="font-medium text-foreground">{task.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1 mb-4 line-clamp-2">{task.description}</p>
                        {task.deadline && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-3 font-medium bg-amber-50 w-fit px-2 py-1 rounded">
                            <Calendar className="w-3 h-3" /> Due: {task.deadline}
                          </div>
                        )}
                        <button
                          onClick={() => handleCompleteTask(task.id)}
                          className="w-full flex justify-center items-center gap-2 py-2.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl font-medium transition-all shadow-sm shadow-primary/20"
                        >
                          <CheckCircle className="w-4 h-4" /> Mark Complete
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Lectures List */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-2xl font-display font-bold text-foreground">Lecture Materials</h2>

            {lectures.length === 0 ? (
              <div className="bg-card border border-dashed border-border rounded-2xl p-12 text-center">
                <BookOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground">No lectures available yet.</p>
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
                        <h3 className="text-xl font-bold text-foreground">{lecture.title}</h3>
                        {lecture.status === 'done' && <StatusBadge status="completed" />}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1">{lecture.description}</p>
                      <p className="text-xs text-muted-foreground mt-2 font-medium">
                        {format(new Date(lecture.createdAt), "MMMM d, yyyy")}
                      </p>
                    </div>
                    <Link href={`/lectures/${lecture.id}`} className="px-5 py-2.5 bg-secondary text-secondary-foreground rounded-xl font-medium hover:bg-secondary/80 transition-colors flex items-center justify-center gap-2 whitespace-nowrap">
                      Study Material <ArrowRight className="w-4 h-4" />
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
