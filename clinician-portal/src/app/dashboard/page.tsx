"use client";

import { useState } from "react";
import { 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  Search, 
  Filter,
  ArrowUpRight,
  TrendingDown,
  TrendingUp,
  MoreHorizontal,
  ChevronRight
} from "lucide-react";
import { MOCK_PATIENTS } from "@/data/mockPatients";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { usePatients } from "@/hooks/usePatients";

export default function DashboardPage() {
  const { patients, loading, error } = usePatients();
  const [searchTerm, setSearchTerm] = useState("");

  const data = patients.length > 0 ? patients : MOCK_PATIENTS;

  const filteredPatients = data.filter(p => 
    p.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = [
    { name: "Total Patients", value: data.length.toString(), icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { name: "At Risk", value: data.filter(p => p.riskStatus === "high").length.toString(), icon: AlertCircle, color: "text-red-500", bg: "bg-red-500/10" },
    { name: "Stable", value: data.filter(p => p.riskStatus === "low").length.toString(), icon: CheckCircle2, color: "text-green-500", bg: "bg-green-500/10" },
    { name: "Pending Review", value: "8", icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  if (loading) return <div className="flex items-center justify-center h-[50vh]"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div>;
  if (error) return <div className="p-8 text-red-500 bg-red-500/10 rounded-xl border border-red-500/20">Error loading patients: {error}</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Patient Triage</h1>
        <p className="text-muted-foreground">Monitor patient recovery metrics and identify at-risk trends at a glance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="border-none bg-card/40 backdrop-blur-md">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">{stat.name}</p>
                  <p className="text-3xl font-bold">{stat.value}</p>
                </div>
                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-none bg-card/40 backdrop-blur-md overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-7">
          <div>
            <CardTitle className="text-xl font-bold">Patient List</CardTitle>
            <CardDescription>Live telemetry from active Smart Sleeve users.</CardDescription>
          </div>
          <div className="flex gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search patients..." 
                className="pl-10 w-64 bg-background/50 border-border/50"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Button variant="outline" className="gap-2 bg-background/50 border-border/50">
              <Filter className="h-4 w-4" />
              Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="w-[300px]">Patient</TableHead>
                <TableHead>Risk Status</TableHead>
                <TableHead>Symmetry</TableHead>
                <TableHead>ROM</TableHead>
                <TableHead>Last Session</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.uid} className="group border-border/40 hover:bg-accent/30 transition-colors">
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10 ring-2 ring-background ring-offset-2 ring-offset-border/10">
                        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.displayName}`} />
                        <AvatarFallback>{patient.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold">{patient.displayName}</div>
                        <div className="text-xs text-muted-foreground">{patient.therapyGoal}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={cn(
                        "rounded-full px-3 py-1 font-medium capitalize border-none",
                        patient.riskStatus === "high" ? "bg-red-500/10 text-red-500" :
                        patient.riskStatus === "medium" ? "bg-amber-500/10 text-amber-500" :
                        "bg-green-500/10 text-green-500"
                      )}
                    >
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full mr-2",
                        patient.riskStatus === "high" ? "bg-red-500" :
                        patient.riskStatus === "medium" ? "bg-amber-500" :
                        "bg-green-500"
                      )} />
                      {patient.riskStatus}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                       <span className="font-semibold">{patient.recentSymmetry}%</span>
                       {patient.recentSymmetry && patient.recentSymmetry < 80 ? (
                         <TrendingDown className="h-4 w-4 text-red-500" />
                       ) : (
                         <TrendingUp className="h-4 w-4 text-green-500" />
                       )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-semibold">{patient.recentROM}°</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {patient.lastSessionAt ? formatDistanceToNow(patient.lastSessionAt, { addSuffix: true }) : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/patients/${patient.uid}`}>
                      <Button variant="ghost" size="sm" className="group-hover:bg-primary group-hover:text-primary-foreground rounded-lg transition-all">
                        View Profile
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
