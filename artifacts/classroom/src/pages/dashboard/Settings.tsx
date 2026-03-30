import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Navbar } from "@/components/layout/Navbar";
import { useSyncUser } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, User, Bell, Shield, 
  Moon, Sun, Globe, Save, Loader2, Mail, BadgeCheck
} from "lucide-react";
import { motion } from "framer-motion";

export default function Settings() {
  const { dbUser, firebaseUser } = useAuth();
  const { toast } = useToast();
  const syncUserMutation = useSyncUser();

  const [displayName, setDisplayName] = useState(dbUser?.displayName || "");
  const [email] = useState(firebaseUser?.email || "");
  const [notifications, setNotifications] = useState(true);
  const [theme, setTheme] = useState("light");

  const handleSaveProfile = async () => {
    if (!firebaseUser) return;
    try {
      await syncUserMutation.mutateAsync({
        data: {
          firebaseUid: firebaseUser.uid,
          email: firebaseUser.email || "",
          displayName: displayName,
          role: dbUser?.role || "teacher"
        }
      });
      toast({ title: "Profile updated successfully" });
    } catch {
      toast({ title: "Failed to update profile", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 pt-12">
        <div className="mb-12">
          <h1 className="text-4xl font-display font-bold flex items-center gap-3">
            <div className="bg-secondary p-2 rounded-2xl">
              <SettingsIcon className="w-8 h-8 text-muted-foreground" />
            </div>
            Settings
          </h1>
          <p className="text-muted-foreground mt-2 text-lg">
            Manage your account details and classroom preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Sidebar Nav */}
          <div className="lg:col-span-1 space-y-2">
            <button className="w-full flex items-center gap-3 px-4 py-3 bg-secondary text-foreground rounded-xl font-bold transition-all border border-border/50">
              <User className="w-5 h-5" /> Profile Info
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-secondary/50 rounded-xl font-medium transition-all">
              <Bell className="w-5 h-5" /> Notifications
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-secondary/50 rounded-xl font-medium transition-all">
              <Shield className="w-5 h-5" /> Privacy & Security
            </button>
            <button className="w-full flex items-center gap-3 px-4 py-3 text-muted-foreground hover:bg-secondary/50 rounded-xl font-medium transition-all">
              <Globe className="w-5 h-5" /> Language
            </button>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Section */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-primary" /> Public Profile
              </h2>
              
              <div className="space-y-6">
                <div className="grid gap-2">
                  <label className="text-sm font-bold text-foreground ml-1">Display Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full px-4 py-3 bg-secondary/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-medium"
                    placeholder="Enter your name"
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-bold text-foreground ml-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      disabled
                      type="email"
                      value={email}
                      className="w-full pl-11 pr-4 py-3 bg-muted/30 border border-border rounded-xl text-muted-foreground cursor-not-allowed italic"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-bold text-foreground ml-1">Classroom Role</label>
                  <div className="flex items-center gap-2 px-4 py-3 bg-primary/5 border border-primary/20 rounded-xl">
                    <BadgeCheck className="w-5 h-5 text-primary" />
                    <span className="font-bold text-primary capitalize">{dbUser?.role || "Teacher"}</span>
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    onClick={handleSaveProfile}
                    disabled={syncUserMutation.isPending}
                    className="flex items-center justify-center gap-2 px-8 py-3 bg-primary text-primary-foreground rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                  >
                    {syncUserMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Appearance Section */}
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card border border-border rounded-3xl p-8 shadow-sm"
            >
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Sun className="w-5 h-5 text-amber-500" /> Environment
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">Push Notifications</h4>
                    <p className="text-sm text-muted-foreground mt-1">Receive alerts when AI extractions are ready.</p>
                  </div>
                  <button 
                    onClick={() => setNotifications(!notifications)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-primary/20 ${notifications ? 'bg-primary' : 'bg-muted'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-foreground">Dark Mode</h4>
                    <p className="text-sm text-muted-foreground mt-1">Automatically adjust interface to your OS level.</p>
                  </div>
                  <div className="flex bg-secondary p-1 rounded-xl gap-1">
                    <button 
                      onClick={() => setTheme("light")}
                      className={`p-2 rounded-lg transition-all ${theme === "light" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
                    >
                      <Sun className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setTheme("dark")}
                      className={`p-2 rounded-lg transition-all ${theme === "dark" ? "bg-background shadow-sm text-primary" : "text-muted-foreground"}`}
                    >
                      <Moon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  );
}
