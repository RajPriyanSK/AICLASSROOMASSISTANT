import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";
import { useSyncUser } from "@workspace/api-client-react";
import { BookOpen, LogIn, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { resetPassword } = useAuth();
  const syncMutation = useSyncUser();

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLocation("/");
    } catch (error: any) {
      const msg =
        error.code === "auth/invalid-credential" || error.code === "auth/wrong-password"
          ? "Invalid email or password."
          : error.code === "auth/user-not-found"
          ? "No account with this email. Please sign up."
          : error.code === "auth/too-many-requests"
          ? "Too many failed attempts. Try again later."
          : error.message;
      toast({ title: "Login Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await syncMutation.mutateAsync({
        data: {
          firebaseUid: result.user.uid,
          email: result.user.email ?? "",
          displayName: result.user.displayName,
          role: "student",
        },
      });
      setLocation("/");
    } catch (error: any) {
      if (error.code !== "auth/popup-closed-by-user") {
        toast({ title: "Google Login Failed", description: error.message, variant: "destructive" });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await resetPassword(resetEmail);
      setResetSent(true);
    } catch (error: any) {
      toast({ title: "Reset Failed", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md bg-card border border-border rounded-3xl p-8 shadow-xl shadow-primary/5"
      >
        <div className="flex justify-center mb-8">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {showReset ? (
            <motion.div key="reset" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-2xl font-bold text-center text-foreground mb-2">Reset Password</h2>
              <p className="text-center text-muted-foreground text-sm mb-6">
                We'll send a reset link to your email.
              </p>

              {resetSent ? (
                <div className="text-center p-6 bg-emerald-50 rounded-2xl border border-emerald-100">
                  <p className="text-emerald-700 font-medium">Check your inbox!</p>
                  <p className="text-sm text-emerald-600 mt-1">A reset link was sent to {resetEmail}.</p>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="name@example.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all"
                  >
                    Send Reset Link
                  </button>
                </form>
              )}

              <button
                onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(""); }}
                className="mt-4 w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                ← Back to Login
              </button>
            </motion.div>
          ) : (
            <motion.div key="login" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <h2 className="text-3xl font-bold text-center text-foreground mb-2">Welcome Back</h2>
              <p className="text-center text-muted-foreground mb-8">Sign in to access your AI Classroom</p>

              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                    placeholder="name@example.com"
                    required
                    autoComplete="email"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-sm font-medium text-foreground">Password</label>
                    <button
                      type="button"
                      onClick={() => setShowReset(true)}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 rounded-xl bg-background border border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                      placeholder="••••••••"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><LogIn className="w-5 h-5" /> Sign In</>
                  )}
                </button>
              </form>

              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-border" />
                <span className="px-4 text-sm text-muted-foreground">or continue with</span>
                <div className="flex-1 border-t border-border" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={googleLoading}
                className="w-full flex justify-center items-center gap-2 px-4 py-3 rounded-xl font-medium bg-background border border-border hover:bg-secondary transition-all disabled:opacity-60"
              >
                {googleLoading ? (
                  <span className="w-5 h-5 border-2 border-border border-t-foreground rounded-full animate-spin" />
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                )}
                {googleLoading ? "Signing in..." : "Google"}
              </button>

              <p className="mt-8 text-center text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary font-semibold hover:underline">
                  Sign up
                </Link>
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
