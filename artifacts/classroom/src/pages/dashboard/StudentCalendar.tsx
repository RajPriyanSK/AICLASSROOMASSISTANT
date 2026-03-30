import { useState, useMemo } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { 
  useGetTasks, 
  useGetLectures,
  getGetTasksQueryKey,
  getGetLecturesQueryKey
} from "@workspace/api-client-react";
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
} from "date-fns";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  Clock, BookOpen, AlertCircle, Loader2 
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function StudentCalendar() {
  const { firebaseUser } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());

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

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const eventsByDay = useMemo(() => {
    const events: Record<string, any[]> = {};
    
    lectures.forEach(lecture => {
      const day = format(new Date(lecture.createdAt), "yyyy-MM-dd");
      if (!events[day]) events[day] = [];
      events[day].push({ type: "lecture", title: lecture.title, status: lecture.status });
    });

    tasks.forEach(task => {
      if (task.deadline) {
        const day = format(new Date(task.deadline), "yyyy-MM-dd");
        if (!events[day]) events[day] = [];
        events[day].push({ type: "task", title: task.title, status: task.status });
      }
    });

    return events;
  }, [lectures, tasks]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <main className="max-w-6xl mx-auto px-4 pt-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div>
            <h1 className="text-4xl font-display font-bold flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-2xl">
                <CalendarIcon className="w-8 h-8 text-primary" />
              </div>
              Student Calendar
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              View your personalized study schedule and assignment deadlines.
            </p>
          </div>

          <div className="flex items-center gap-4 bg-card border border-border p-2 rounded-2xl shadow-sm">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-secondary rounded-xl transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold min-w-[150px] text-center">
              {format(currentDate, "MMMM yyyy")}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-secondary rounded-xl transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <p className="text-muted-foreground font-medium">Syncing your schedule...</p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-3xl overflow-hidden shadow-xl">
            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b border-border bg-secondary/30">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="py-4 text-center text-sm font-bold text-muted-foreground uppercase tracking-wider">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 auto-rows-[120px] sm:auto-rows-[160px]">
              {calendarDays.map((day, i) => {
                const dateKey = format(day, "yyyy-MM-dd");
                const dayEvents = eventsByDay[dateKey] || [];
                const isSelectedMonth = isSameMonth(day, monthStart);
                const isToday = isSameDay(day, new Date());

                return (
                  <div
                    key={day.toString()}
                    className={`border-r border-b border-border p-2 transition-colors ${
                      !isSelectedMonth ? "bg-muted/10 opacity-40" : "bg-card"
                    } ${isToday ? "ring-2 ring-inset ring-primary/20 bg-primary/5" : ""}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full ${
                        isToday ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" : "text-foreground"
                      }`}>
                        {format(day, "d")}
                      </span>
                    </div>

                    <div className="space-y-1.5 overflow-y-auto max-h-[80px] sm:max-h-[120px] scrollbar-hide">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={idx}
                          className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium truncate flex items-center gap-1.5 ${
                            event.type === "lecture" 
                              ? "bg-blue-50 text-blue-700 border border-blue-100" 
                              : "bg-amber-50 text-amber-700 border border-amber-100"
                          }`}
                          title={event.title}
                        >
                          {event.type === "lecture" ? <BookOpen className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                          {event.title}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-8 flex items-center justify-center gap-8 bg-card border border-border p-4 rounded-2xl shadow-sm inline-flex">
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-3 h-3 bg-blue-100 border border-blue-200 rounded-full" />
            <span className="text-muted-foreground">Class Sessions</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-3 h-3 bg-amber-100 border border-amber-200 rounded-full" />
            <span className="text-muted-foreground">Assignment Deadlines</span>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium">
            <div className="w-3 h-3 bg-primary rounded-full shadow-lg shadow-primary/50" />
            <span className="text-muted-foreground">Today</span>
          </div>
        </div>
      </main>
    </div>
  );
}
