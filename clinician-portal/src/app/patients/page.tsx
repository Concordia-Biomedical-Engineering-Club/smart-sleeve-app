"use client";

import { useState } from "react";
import { Users, Search, Filter, Plus, Download } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { usePatients } from "@/hooks/usePatients";
import { PatientTable } from "@/components/shared/PatientTable";
import { MOCK_PATIENTS } from "@/data/mockPatients";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PatientsPage() {
  const { patients, loading, error } = usePatients();
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState("all");

  const data = patients.length > 0 ? patients : MOCK_PATIENTS;

  const filteredPatients = data.filter(p => {
    const matchesSearch = p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (filter === "all") return matchesSearch;
    if (filter === "at-risk") return matchesSearch && p.riskStatus === "high";
    if (filter === "stable") return matchesSearch && p.riskStatus === "low";
    return matchesSearch;
  });

  if (loading) return <div className="flex items-center justify-center h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">Patient Directory</h1>
          <p className="text-muted-foreground">Manage your entire patient population and therapy assignments.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="gap-2 rounded-xl border-border/50 bg-background/50">
            <Download className="h-4 w-4" />
            Export Data
          </Button>
          <Button className="gap-2 rounded-xl shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" />
            Add Patient
          </Button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <Tabs defaultValue="all" className="w-full md:w-auto" onValueChange={setFilter}>
          <TabsList className="bg-card/40 backdrop-blur-md border-none p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg px-6">All Patients</TabsTrigger>
            <TabsTrigger value="at-risk" className="rounded-lg px-6">At Risk</TabsTrigger>
            <TabsTrigger value="stable" className="rounded-lg px-6">Stable</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex gap-4 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or email..." 
              className="pl-10 w-full bg-background/50 border-border/50 h-11 rounded-xl"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl border-border/50 bg-background/50">
            <Filter className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <PatientTable patients={filteredPatients} />
      
      <p className="text-center text-xs text-muted-foreground uppercase tracking-widest font-bold opacity-30 pt-4">
        Showing {filteredPatients.length} of {data.length} registered patients
      </p>
    </div>
  );
}
