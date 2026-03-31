import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { LogOut, BookOpen, Mic, ListTodo, Calendar, Settings, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { firebaseUser, dbUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const handleLogout = async () => {
    await auth.signOut();
    setLocation("/login");
  };

  const navLinks = dbUser?.role === "teacher" 
    ? [
        { href: "/dashboard/teacher", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/teacher/recording", label: "Recording", icon: Mic },
        { href: "/dashboard/teacher/tasks", label: "Tasks", icon: ListTodo },
        { href: "/dashboard/teacher/calendar", label: "Calendar", icon: Calendar },
        { href: "/dashboard/teacher/settings", label: "Settings", icon: Settings },
      ]
    : [
        { href: "/dashboard/student", label: "Dashboard", icon: LayoutDashboard },
        { href: "/dashboard/student/lectures", label: "Lectures", icon: BookOpen },
        { href: "/dashboard/student/tasks", label: "Assignments", icon: ListTodo },
        { href: "/dashboard/student/calendar", label: "Calendar", icon: Calendar },
        { href: "/dashboard/student/settings", label: "Settings", icon: Settings },
      ];

  if (!firebaseUser) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display font-bold text-xl text-foreground hidden xs:block">
              AI Classroom
            </span>
          </div>

          <div className="hidden lg:flex items-center gap-1 bg-secondary/50 p-1 rounded-2xl border border-border/50">
            {navLinks.map((link) => (
              <Link 
                key={link.href}
                href={link.href} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${location === link.href ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
              >
                <link.icon className="w-4 h-4" /> {link.label}
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2 sm:gap-6">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-medium text-foreground">
                {dbUser?.displayName || firebaseUser.email}
              </span>
              <span className="text-xs text-muted-foreground capitalize bg-secondary px-2 py-0.5 rounded-full">
                {dbUser?.role || "User"}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="hidden sm:flex p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 text-muted-foreground hover:bg-secondary rounded-xl transition-colors"
            >
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl h-[calc(100vh-64px)] overflow-y-auto pb-8">
          <div className="p-4 space-y-4">
            <div className="flex items-center gap-4 p-4 bg-secondary/30 rounded-2xl md:hidden">
              <div className="bg-primary/10 p-3 rounded-full">
                <Settings className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{dbUser?.displayName || firebaseUser.email}</p>
                <p className="text-xs text-muted-foreground capitalize">{dbUser?.role || "User"}</p>
              </div>
            </div>

            <div className="grid gap-2">
              {navLinks.map((link) => (
                <Link 
                  key={link.href}
                  href={link.href} 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 p-4 rounded-2xl text-base font-semibold transition-all ${location === link.href ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "bg-card border border-border/50 text-foreground hover:bg-secondary"}`}
                >
                  <link.icon className="w-5 h-5" /> {link.label}
                </Link>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 p-4 bg-destructive/10 text-destructive rounded-2xl text-base font-semibold transition-all"
            >
              <LogOut className="w-5 h-5" /> Sign Out
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}
