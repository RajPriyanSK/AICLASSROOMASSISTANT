import { useState } from "react";
import { Link, useLocation } from "wouter";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useSyncUser } from "@workspace/api-client-react";
import { BookOpen, UserPlus, Eye, EyeOff, GraduationCap, School } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

type Role = "teacher" | "student";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<Role>("student");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const syncMutation = useSyncUser();

  const passwordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: "Too short", color: "bg-red-500", width: "w-1/4" };
    if (password.length < 8) return { label: "Weak", color: "bg-amber-500", width: "w-2/4" };
    if (/[^a-zA-Z0-9]/.test(password)) return { label: "Strong", color: "bg-emerald-500", width: "w-full" };
    return { label: "Good", color: "bg-blue-500", width: "w-3/4" };
  };
  const strength = passwordStrength();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Password too short", description: "Use at least 6 characters.", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const result = await createUserWithEmailAndPassword(auth, email, password);

      await updateProfile(result.user, { displayName });

      await syncMutation.mutateAsync({
        data: {
          firebaseUid: result.user.uid,
          email: result.user.email ?? email,
          displayName,
          role,
        },
      });

      toast({
        title: "Account Created!",
        description: `Welcome, ${displayName}. Redirecting to your dashboard…`,
      });

      setLocation("/");
    } catch (error: any) {
      const msg =
        error.code === "auth/email-already-in-use"
          ? "This email is already registered. Please log in."
          : error.code === "auth/invalid-email"
          ? "Please enter a valid email address."
          : error.code === "auth/weak-password"
          ? "Password is too weak. Use at least 6 characters."
          : error.message;
      toast({ title: "Signup Failed", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
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
        <div className="flex justify-center mb-6">
          <div className="bg-primary/10 p-4 rounded-2xl">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center text-foreground mb-2">Create Account</h2>
        <p className="text-center text-muted-foreground mb-8">Join the AI Classroom platform</p>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Role Selection */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">I am joining as...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole("student")}
                className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 font-semibold transition-all ${
                  role === "student"
                    ? "border-primary bg-primary/5 text-primary shadow-md shadow-primary/10"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <GraduationCap className="w-6 h-6" />
                <span>Student</span>
                {role === "student" && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
              <button
                type="button"
                onClick={() => setRole("teacher")}
                className={`relative flex flex-col items-center gap-2 py-4 px-3 rounded-2xl border-2 font-semibold transition-all ${
                  role === "teacher"
                    ? "border-primary bg-primary/5 text-primary shadow-md shadow-primary/10"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40"
                }`}
              >
                <School className="w-6 h-6" />
                <span>Teacher</span>
                {role === "teacher" && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                )}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Full Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-background border border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
              placeholder={role === "teacher" ? "Dr. Jane Smith" : "John Doe"}
              required
              autoComplete="name"
            />
          </div>

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
            <label className="block text-sm font-medium text-foreground mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 rounded-xl bg-background border border-border focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="Min. 6 characters"
                required
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {strength && (
              <div className="mt-2">
                <div className="h-1.5 bg-border rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${strength.color} ${strength.width}`} />
                </div>
                <p className={`text-xs mt-1 font-medium ${strength.color.replace("bg-", "text-")}`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Confirm Password</label>
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full px-4 py-3 rounded-xl bg-background border focus:outline-none focus:ring-4 transition-all ${
                confirmPassword && confirmPassword !== password
                  ? "border-destructive focus:ring-destructive/10"
                  : "border-border focus:border-primary focus:ring-primary/10"
              }`}
              placeholder="Re-enter password"
              required
              autoComplete="new-password"
            />
            {confirmPassword && confirmPassword !== password && (
              <p className="text-xs text-destructive mt-1">Passwords don't match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || (!!confirmPassword && confirmPassword !== password)}
            className="w-full mt-2 flex justify-center items-center gap-2 px-4 py-3 rounded-xl font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/20 transition-all disabled:opacity-60"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <><UserPlus className="w-5 h-5" /> Create {role === "teacher" ? "Teacher" : "Student"} Account</>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-primary font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
