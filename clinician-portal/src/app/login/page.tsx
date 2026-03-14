"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Activity, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please check your credentials.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background p-6">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/20 ring-4 ring-primary/10 transition-transform hover:scale-110 duration-300">
            <Activity className="text-primary-foreground h-8 w-8" />
          </div>
          <h1 className="text-4xl font-black tracking-tight mb-2">SmartSleeve</h1>
          <p className="text-muted-foreground font-medium">Clinician Enterprise Portal</p>
        </div>

        <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden glassmorphism">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-blue-400" />
          <CardHeader className="pt-8 text-center">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>Enter your clinical credentials to access patient data.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-5">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    type="email" 
                    placeholder="clinical.email@smart-sleeve.com" 
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:ring-primary/30 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 bg-background/50 border-border/50 focus:ring-primary/30 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-xl animate-in shake-in-1 duration-300">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform active:scale-[0.98]" 
                disabled={loading}
              >
                {loading ? "Authenticating..." : (
                  <>
                    Sign In
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pb-8 justify-center">
            <p className="text-sm text-muted-foreground">
              Forgot your password? <span className="text-primary font-bold cursor-pointer hover:underline">Reset here</span>
            </p>
          </CardFooter>
        </Card>
        
        <p className="mt-8 text-center text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-50">
          Secure Medical-Grade Data Infrastructure
        </p>
      </div>
    </div>
  );
}
