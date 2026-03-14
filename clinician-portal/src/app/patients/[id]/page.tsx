"use client";

import { use } from "react";
import {
  ArrowLeft,
  Calendar,
  Target,
  Zap,
  TrendingUp,
  AlertTriangle,
  ChevronRight,
  Activity,
  History,
  FileText,
} from "lucide-react";
import Link from "next/link";
import { MOCK_PATIENTS } from "@/data/mockPatients";
import { MOCK_SESSIONS } from "@/data/mockSessions";
import { EXERCISE_LIBRARY } from "@/data/exercises";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GoalPrescription } from "@/components/patients/GoalPrescription";
import { useSessions } from "@/hooks/useSessions";
import { usePatients } from "@/hooks/usePatients";
import { TelemetryChart } from "@/components/shared/TelemetryChart";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export default function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { patients } = usePatients();
  const { sessions, loading: sessionsLoading } = useSessions(id);

  const fetchedPatient = patients.find((p) => p.uid === id);
  const patient = fetchedPatient || MOCK_PATIENTS.find((p) => p.uid === id);
  const displaySessions =
    sessions.length > 0 ? sessions : MOCK_SESSIONS[id] || [];

  if (!patient)
    return (
      <div className="p-8 text-center text-muted-foreground">
        Patient profile not found.
      </div>
    );

  const chartData = displaySessions
    .map((s) => ({
      date: format(new Date(s.timestamp), "MMM d"),
      rom: s.analytics?.romDegrees || 0,
      symmetry: 100 - (s.analytics?.deficitPercentage || 0),
      quality: s.analytics?.exerciseQuality || 0,
    }))
    .reverse(); // Sessions are desc, charts usually want chron

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full hover:bg-accent"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold tracking-tight">
                {patient.displayName}
              </h1>
              <Badge
                variant="outline"
                className="bg-green-500/10 text-green-500 border-none capitalize"
              >
                {patient.injuredSide}-Side Recovery
              </Badge>
            </div>
            <p className="text-muted-foreground">
              {patient.email} • ID: {patient.uid}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="gap-2 bg-background/50 border-border/50"
          >
            <FileText className="h-4 w-4" />
            Clearance Report
          </Button>
          <Button className="gap-2 shadow-lg shadow-primary/20">
            <Target className="h-4 w-4" />
            Update Protocol
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none bg-card/40 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Current ROM
                </p>
                <p className="text-2xl font-bold">
                  {patient.recentROM}°{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    / 120° Goal
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-card/40 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-blue-500/10">
                <Activity className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Avg. Symmetry
                </p>
                <p className="text-2xl font-bold">
                  {patient.recentSymmetry}%{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    L. Quad Bias
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-none bg-card/40 backdrop-blur-md">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-amber-500/10">
                <Zap className="h-6 w-6 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  Compliance
                </p>
                <p className="text-2xl font-bold">
                  {patient.complianceScore ?? "0"}%{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    Last 7 Days
                  </span>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="trends" className="w-full">
        <TabsList className="bg-card/40 backdrop-blur-md border-none p-1 rounded-xl mb-6">
          <TabsTrigger
            value="trends"
            className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <TrendingUp className="h-4 w-4 mr-2" />
            Longitudinal Trends
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="rounded-lg px-6 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <History className="h-4 w-4 mr-2" />
            Session History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <Card className="lg:col-span-2 border-none bg-card/40 backdrop-blur-md p-6">
              <CardHeader className="px-0 pt-0 pb-8">
                <CardTitle>Recovery Progress Dashboard</CardTitle>
                <CardDescription>
                  Correlation between Range of Motion and Muscle Symmetry over
                  time.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 h-[400px]">
                <TelemetryChart data={chartData} />
              </CardContent>
            </Card>

            {patient && <GoalPrescription patient={patient as any} />}
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card className="border-none bg-card/40 backdrop-blur-md">
            <CardContent className="p-0">
              <div className="divide-y divide-border/20">
                {displaySessions.map((session, i) => (
                  <div
                    key={session.id}
                    className="p-6 flex items-center justify-between hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex items-center gap-6">
                      <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold">
                          {format(new Date(session.timestamp), "EEEE, MMMM do")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {EXERCISE_LIBRARY.find((e) => e.id === session.exerciseType)?.name || "Unknown Exercise"} • {Math.round(session.duration / 60)}m • {session.completedReps} reps
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-8 items-center">
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                          Peak ROM
                        </div>
                        <div className="font-mono text-lg">
                          {session.analytics?.romDegrees || 0}°
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-1">
                          Quality
                        </div>
                        <Badge
                          variant="outline"
                          className="bg-blue-500/10 text-blue-500 border-none"
                        >
                          {session.analytics?.exerciseQuality || 0}%
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
