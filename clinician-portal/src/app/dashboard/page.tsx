"use client";

import { useState } from "react";
import { 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter,
  ChevronRight
} from "lucide-react";
import { MOCK_PATIENTS } from "@/data/mockPatients";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePatients } from "@/hooks/usePatients";
import { StatGrid } from "@/components/shared/StatGrid";
import { PatientTable } from "@/components/shared/PatientTable";

export default function DashboardPage() {
  const { patients, loading, error } = usePatients();
  const [searchTerm, setSearchTerm] = useState("");

  const data = patients.length > 0 ? patients : MOCK_PATIENTS;

  const filteredPatients = data.filter(p => 
    p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { 
      name: "Total Patients", 
      value: data.length.toString(), 
      icon: Users, 
      color: "text-blue-500", 
      bg: "bg-blue-500/10",
      description: "Active monitoring"
    },
    { 
      name: "At Risk", 
      value: data.filter(p => p.riskStatus === "high").length.toString(), 
      icon: AlertCircle, 
      color: "text-red-500", 
      bg: "bg-red-500/10",
      description: "Immediate action required"
    },
    { 
      name: "Stable", 
      value: data.filter(p => p.riskStatus === "low").length.toString(), 
      icon: CheckCircle2, 
      color: "text-green-500", 
      bg: "bg-green-500/10",
      description: "Normal recovery path"
    },
    { 
      name: "Avg. Compliance", 
      value: "88%", 
      icon: Clock, 
      color: "text-amber-500", 
      bg: "bg-amber-500/10",
      description: "Last 7 days"
    },
  ];

  if (loading) return <div className="flex items-center justify-center h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  if (error) {
    const isPermissionError = error.includes("permissions") || error.includes("denied");
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Card className="max-w-md border-none bg-card/40 backdrop-blur-xl p-8 glassmorphism text-center">
          <div className="w-20 h-20 rounded-3xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-amber-500" />
          </div>
          <CardTitle className="text-2xl font-bold mb-4">Clinician Access Required</CardTitle>
          <CardDescription className="text-base mb-8">
            {isPermissionError 
              ? "Your account is authenticated, but it hasn't been configured for clinical access yet. If you used a patient account, you need to upgrade it."
              : `System Error: ${error}`}
          </CardDescription>
          <div className="space-y-4">
            <Button asChild className="w-full h-12 rounded-xl text-lg font-bold shadow-xl shadow-primary/20">
              <Link href="/register">Upgrade to Clinician</Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              Logged in as <span className="text-foreground font-bold">{patients[0]?.email || "Authenticated User"}</span>
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Patient Triage</h1>
          <p className="text-muted-foreground">Monitor patient recovery metrics and identify at-risk trends at a glance.</p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search patients..." 
              className="pl-10 w-64 bg-background/50 border-border/50 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" className="h-11 px-5 rounded-xl gap-2 border-border/50 bg-background/50">
            <Filter className="h-4 w-4" />
            Filter
          </Button>
        </div>
      </div>

      <StatGrid stats={stats} />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">Active Patient Telemetry</h2>
          <Link href="/patients" className="text-sm text-primary font-bold hover:underline flex items-center gap-1">
            View All Patients <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
        <PatientTable patients={filteredPatients} />
      </div>
    </div>
  );
}
