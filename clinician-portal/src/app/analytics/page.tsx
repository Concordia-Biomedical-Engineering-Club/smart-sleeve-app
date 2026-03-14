"use client";

import { TrendingUp, BarChart3, Zap, Calendar, ArrowUpRight, Clock, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatGrid } from "@/components/shared/StatGrid";
import { TelemetryChart } from "@/components/shared/TelemetryChart";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const populationStats = [
    {
      name: "Avg. Recovery Time",
      value: "42 Days",
      icon: Clock,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      description: "Post-ACL survey avg."
    },
    {
      name: "Population Compliance",
      value: "84%",
      icon: Zap,
      color: "text-amber-500",
      bg: "bg-amber-500/10",
      description: "Across all protocols"
    },
    {
      name: "Total Sessions",
      value: "1,284",
      icon: BarChart3,
      color: "text-green-500",
      bg: "bg-green-500/10",
      description: "Past 30 days"
    },
    {
      name: "Growth Rate",
      value: "+12%",
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      description: "New patient onboarding"
    },
  ];

  // Aggregate data for the bar chart (Mock)
  const populationData = [
    { date: "Week 1", rom: 65, symmetry: 60 },
    { date: "Week 2", rom: 72, symmetry: 68 },
    { date: "Week 3", rom: 80, symmetry: 75 },
    { date: "Week 4", rom: 88, symmetry: 82 },
    { date: "Week 5", rom: 95, symmetry: 90 },
    { date: "Week 6", rom: 105, symmetry: 94 },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Population Analytics</h1>
        <p className="text-muted-foreground">Deep-dive into clinical outcomes and institutional efficiency metrics.</p>
      </div>

      <StatGrid stats={populationStats} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none bg-card/40 backdrop-blur-md p-6 overflow-hidden">
          <CardHeader className="px-0 pt-0 pb-8">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recovery Trajectory (Institutional Avg.)</CardTitle>
                <CardDescription>Aggregate ROM and Symmetry improvements across the first 6 weeks post-op.</CardDescription>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-none">30 Day Window</Badge>
            </div>
          </CardHeader>
          <CardContent className="px-0 h-[400px]">
            <TelemetryChart data={populationData} type="bar" />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-none bg-card/40 backdrop-blur-md overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Risk Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: "High Risk (Immediate Review)", value: 12, color: "bg-red-500" },
                  { label: "Moderate Risk (Watchlist)", value: 28, color: "bg-amber-500" },
                  { label: "Stable (Tracking Well)", value: 60, color: "bg-green-500" },
                ].map((item) => (
                  <div key={item.label} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="font-bold">{item.value}%</span>
                    </div>
                    <div className="h-2 w-full bg-border/20 rounded-full overflow-hidden">
                      <div className={cn("h-full rounded-full", item.color)} style={{ width: `${item.value}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-none bg-primary shadow-xl shadow-primary/20 text-primary-foreground relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110 duration-500" />
            <CardContent className="p-6 relative z-10">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 rounded-2xl bg-white/20">
                  <ArrowUpRight className="h-6 w-6" />
                </div>
              </div>
              <h3 className="font-black text-xl mb-2 tracking-tight">Clinical Insight</h3>
              <p className="text-primary-foreground/90 text-sm font-medium leading-relaxed">
                Compliance in Week 3 is up across the clinic. This correlates with the new protocol reminders deployed recently.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
