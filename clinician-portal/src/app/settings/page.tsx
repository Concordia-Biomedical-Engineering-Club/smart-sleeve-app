"use client";

import { User, Building, Shield, Bell, CreditCard, ChevronRight, Stethoscope, Mail, Globe } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";

export default function SettingsPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Portal Settings</h1>
        <p className="text-muted-foreground">Manage your clinical profile, institution details, and notification preferences.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          {[
            { name: "Clinical Profile", icon: User, active: true },
            { name: "Clinic Information", icon: Building },
            { name: "Security & Privacy", icon: Shield },
            { name: "Portal Notifications", icon: Bell },
            { name: "Billing & Plans", icon: CreditCard },
          ].map((item) => (
            <div 
              key={item.name}
              className={cn(
                "flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all",
                item.active 
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                  : "hover:bg-accent text-muted-foreground hover:text-accent-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </div>
              {item.active && <ChevronRight className="h-4 w-4" />}
            </div>
          ))}
        </div>

        <Card className="md:col-span-2 border-none bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle>Professional Profile</CardTitle>
            <CardDescription>Your details as they appear on patient clearance reports and certificates.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="space-y-2 flex-1">
                <Label htmlFor="name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input id="name" defaultValue={user?.displayName || "Dr. Sarah Evans"} className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl" />
                </div>
              </div>
              <div className="space-y-2 flex-1">
                <Label htmlFor="npi">NPI Number / Professional ID</Label>
                <div className="relative">
                  <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                  <Input id="npi" defaultValue="1284950284" className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl" />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Work Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input id="email" defaultValue={user?.email || ""} disabled className="pl-10 bg-muted/30 border-border/50 h-11 rounded-xl opacity-60" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clinic">Primary Clinic</Label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input id="clinic" defaultValue="Concordia Orthopedics & Sports Med" className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Clinic Website</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                <Input id="website" defaultValue="https://concordiaortho.com" className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-6 border-t border-border/20 flex justify-end gap-3">
             <Button variant="ghost" className="rounded-xl">Cancel Changes</Button>
             <Button className="rounded-xl px-8 shadow-lg shadow-primary/20">Save Profile</Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Simple CN helper because I'm using it ad-hoc
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
