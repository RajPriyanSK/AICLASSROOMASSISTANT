import { Link, useLocation } from "wouter";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";
import { LogOut, BookOpen } from "lucide-react";

export function Navbar() {
  const { firebaseUser, dbUser } = useAuth();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    await auth.signOut();
    setLocation("/login");
  };

  if (!firebaseUser) return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary/10 p-2 rounded-xl">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <span className="font-display font-bold text-xl text-foreground hidden sm:block">
              AI Classroom
            </span>
          </div>

          <div className="flex items-center gap-6">
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
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
              title="Logout"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
