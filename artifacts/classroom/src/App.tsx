import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { useEffect } from "react";

// Pages
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import TeacherDashboard from "@/pages/dashboard/TeacherDashboard";
import Recording from "@/pages/dashboard/Recording";
import TasksExtraction from "@/pages/dashboard/TasksExtraction";
import Calendar from "@/pages/dashboard/Calendar";
import Settings from "@/pages/dashboard/Settings";
import StudentDashboard from "@/pages/dashboard/StudentDashboard";
import StudentLectures from "@/pages/dashboard/StudentLectures";
import StudentTasks from "@/pages/dashboard/StudentTasks";
import StudentCalendar from "@/pages/dashboard/StudentCalendar";
import LectureDetail from "@/pages/lectures/LectureDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    }
  }
});

function ProtectedRoute({ component: Component, allowedRole }: { component: any, allowedRole?: 'teacher' | 'student' }) {
  const { firebaseUser, dbUser, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !firebaseUser) {
      setLocation("/login");
    } else if (!isLoading && dbUser && allowedRole && dbUser.role !== allowedRole) {
      // Wrong role, send to their correct dashboard
      setLocation(`/dashboard/${dbUser.role}`);
    }
  }, [isLoading, firebaseUser, dbUser, allowedRole, setLocation]);

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
  if (!firebaseUser) return null;
  if (allowedRole && dbUser?.role !== allowedRole) return null;

  return <Component />;
}

function HomeRouter() {
  const { firebaseUser, dbUser, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading) {
      if (firebaseUser && dbUser) {
        setLocation(`/dashboard/${dbUser.role}`);
      } else {
        setLocation("/login");
      }
    }
  }, [isLoading, firebaseUser, dbUser, setLocation]);

  return <div className="min-h-screen bg-background flex items-center justify-center"><div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div></div>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRouter} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/dashboard/teacher">
        {() => <ProtectedRoute component={TeacherDashboard} allowedRole="teacher" />}
      </Route>
      <Route path="/dashboard/teacher/recording">
        {() => <ProtectedRoute component={Recording} allowedRole="teacher" />}
      </Route>
      <Route path="/dashboard/teacher/tasks">
        {() => <ProtectedRoute component={TasksExtraction} allowedRole="teacher" />}
      </Route>
      <Route path="/dashboard/teacher/calendar">
        {() => <ProtectedRoute component={Calendar} allowedRole="teacher" />}
      </Route>
      <Route path="/dashboard/teacher/settings">
        {() => <ProtectedRoute component={Settings} allowedRole="teacher" />}
      </Route>
      <Route path="/dashboard/student">
        {() => <ProtectedRoute component={StudentDashboard} allowedRole="student" />}
      </Route>
      <Route path="/dashboard/student/lectures">
        {() => <ProtectedRoute component={StudentLectures} allowedRole="student" />}
      </Route>
      <Route path="/dashboard/student/tasks">
        {() => <ProtectedRoute component={StudentTasks} allowedRole="student" />}
      </Route>
      <Route path="/dashboard/student/calendar">
        {() => <ProtectedRoute component={StudentCalendar} allowedRole="student" />}
      </Route>
      <Route path="/dashboard/student/settings">
        {() => <ProtectedRoute component={Settings} allowedRole="student" />}
      </Route>
      <Route path="/lectures/:id">
        {() => <ProtectedRoute component={LectureDetail} />}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
