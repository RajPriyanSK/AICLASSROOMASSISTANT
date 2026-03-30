import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { useGetLectures, getGetLecturesQueryKey } from "@workspace/api-client-react";
import { format } from "date-fns";
import { StatusBadge } from "@/components/StatusBadge";
import { BookOpen, Search, Filter, BookText, ChevronRight, Clock, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";

export default function StudentLectures() {
  const { firebaseUser } = useAuth();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const lecturesParams = { firebaseUid: firebaseUser?.uid || "" };
  const { data: lectures = [], isLoading } = useGetLectures(
    lecturesParams,
    { query: { enabled: !!firebaseUser?.uid, queryKey: getGetLecturesQueryKey(lecturesParams) } }
  );

  const filteredLectures = lectures.filter((lecture) => {
    const matchesSearch = 
      lecture.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecture.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || lecture.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3 text-foreground">
              <div className="bg-primary/10 p-2.5 rounded-2xl">
                <BookText className="w-8 h-8 text-primary" />
              </div>
              Lecture Library
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Browse through all your transcribed lectures and AI summaries.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search titles or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-card border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto bg-secondary/50 p-1 rounded-xl border border-border/50">
              <button
                onClick={() => setStatusFilter("all")}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === "all" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                All
              </button>
              <button
                onClick={() => setStatusFilter("done")}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === "done" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                Transcribed
              </button>
              <button
                onClick={() => setStatusFilter("processing")}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${statusFilter === "processing" ? "bg-background text-primary shadow-sm" : "text-muted-foreground"}`}
              >
                In Progress
              </button>
            </div>
          </div>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 bg-card border border-border rounded-3xl animate-pulse" />
            ))}
          </div>
        ) : filteredLectures.length === 0 ? (
          <div className="bg-card border border-dashed border-border rounded-[2.5rem] p-20 text-center">
            <div className="bg-secondary p-6 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <Search className="w-10 h-10 text-muted-foreground/40" />
            </div>
            <h3 className="text-xl font-bold text-foreground">No lectures found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredLectures.map((lecture) => (
                <motion.div
                  key={lecture.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setLocation(`/lectures/${lecture.id}`)}
                  className="group cursor-pointer bg-card border border-border hover:border-primary/30 rounded-[2rem] p-6 shadow-sm hover:shadow-xl hover:shadow-primary/5 transition-all outline-none focus:ring-2 focus:ring-primary/50"
                >
                  <div className="flex flex-col h-full">
                    <div className="flex items-start justify-between mb-4">
                      <div className="bg-primary/10 p-2.5 rounded-xl group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <BookOpen className="w-5 h-5 text-primary group-hover:text-primary-foreground" />
                      </div>
                      <StatusBadge status={lecture.status} />
                    </div>

                    <h3 className="text-xl font-display font-bold text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-1">
                      {lecture.title}
                    </h3>
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-6 flex-1">
                      {lecture.description || "No description provided."}
                    </p>

                    <div className="pt-4 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(lecture.createdAt), "MMM d, yyyy")}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {format(new Date(lecture.createdAt), "h:mm a")}
                        </div>
                      </div>
                      <div className="bg-secondary p-1.5 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                        <ChevronRight className="w-4 h-4" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>
    </div>
  );
}
