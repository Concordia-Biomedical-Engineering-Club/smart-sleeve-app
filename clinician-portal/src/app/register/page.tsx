"use client";

import { useState } from "react";
import { createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Activity, Lock, Mail, User, Building2, Stethoscope, ArrowRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    password: "",
    clinicName: "",
    npiNumber: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let user;
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        user = userCredential.user;
      } catch (authErr: any) {
        if (authErr.code === "auth/email-already-in-use") {
          // If already in use, we try to see if they can sign in to "upgrade"
          try {
            const loginCred = await signInWithEmailAndPassword(auth, formData.email, formData.password);
            user = loginCred.user;
            console.log("Existing user found, upgrading to clinician role.");
          } catch (loginErr) {
            throw new Error("This email is already registered. Please log in with your existing password to upgrade to a Clinician account.");
          }
        } else {
          throw authErr;
        }
      }

      // Update Firebase Auth profile
      await updateProfile(user, {
        displayName: formData.fullName,
      });

      // Save clinician specific data to dedicated collection
      await setDoc(doc(db, "clinicians", user.uid), {
        uid: user.uid,
        fullName: formData.fullName,
        email: formData.email,
        clinicName: formData.clinicName,
        npiNumber: formData.npiNumber,
        role: "clinician",
        updatedAt: Date.now(),
      }, { merge: true });

      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Registration failed. Please try again.");
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background p-6">
      <div className="w-full max-w-lg animate-in fade-in zoom-in duration-500">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-4 shadow-xl shadow-primary/20">
            <Activity className="text-primary-foreground h-7 w-7" />
          </div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Join SmartSleeve</h1>
          <p className="text-muted-foreground font-medium text-sm">Create clinical credentials for remote monitoring</p>
        </div>

        <Card className="border-none bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden glassmorphism">
          <div className="h-1 w-full bg-gradient-to-r from-primary to-blue-400" />
          <CardHeader className="pt-8 text-center pb-4">
            <CardTitle className="text-xl font-bold">Register Account</CardTitle>
            <CardDescription aria-hidden="true" className="invisible h-0">Registration form for clinicians</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      id="fullName"
                      name="fullName"
                      placeholder="Dr. Sarah Evans" 
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:ring-primary/30 rounded-xl"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      id="email"
                      name="email"
                      type="email" 
                      placeholder="sarah@orthoclinic.com" 
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:ring-primary/30 rounded-xl"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="clinicName">Clinic Name</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      id="clinicName"
                      name="clinicName"
                      placeholder="Concordia Orthopedics" 
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:ring-primary/30 rounded-xl"
                      value={formData.clinicName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="npiNumber">Professional ID / NPI</Label>
                  <div className="relative">
                    <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input 
                      id="npiNumber"
                      name="npiNumber"
                      placeholder="1234567890" 
                      className="pl-10 h-11 bg-background/50 border-border/50 focus:ring-primary/30 rounded-xl"
                      value={formData.npiNumber}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input 
                    id="password"
                    name="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-11 bg-background/50 border-border/50 focus:ring-primary/30 rounded-xl"
                    value={formData.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Registration Error</AlertTitle>
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl text-lg font-bold shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform" 
                disabled={loading}
              >
                {loading ? "Creating Account..." : (
                  <>
                    Complete Registration
                    <ArrowRight className="h-5 w-5 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="pb-8 justify-center border-t border-border/20 pt-6">
            <p className="text-sm text-muted-foreground">
              Already have an account? <Link href="/login" className="text-primary font-bold hover:underline">Sign In</Link>
            </p>
          </CardFooter>
        </Card>
        
        <div className="mt-8 flex items-center justify-center gap-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-500">
           <div className="flex items-center gap-2 text-xs font-bold tracking-tighter">
             <CheckCircle2 className="h-4 w-4" /> HIPAA COMPLIANT
           </div>
           <div className="flex items-center gap-2 text-xs font-bold tracking-tighter">
             <CheckCircle2 className="h-4 w-4" /> SECURE DATA
           </div>
        </div>
      </div>
    </div>
  );
}
