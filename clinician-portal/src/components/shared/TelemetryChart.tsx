"use client";

import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { cn } from "@/lib/utils";

interface TelemetryPoint {
  date: string;
  rom: number;
  symmetry: number;
  quality?: number;
}

interface TelemetryChartProps {
  data: TelemetryPoint[];
  height?: number;
  type?: "area" | "bar";
  className?: string;
}

export function TelemetryChart({ data, height = 400, type = "area", className }: TelemetryChartProps) {
  if (type === "bar") {
    return (
      <div className={cn("w-full", className)} style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "oklch(0.65 0.02 240)", fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: "oklch(0.65 0.02 240)", fontSize: 12 }} 
            />
            <Tooltip 
              contentStyle={{ backgroundColor: "oklch(0.16 0.02 240)", border: "none", borderRadius: "12px", color: "white" }}
              itemStyle={{ color: "white" }}
            />
            <Bar dataKey="rom" fill="oklch(0.65 0.18 255)" radius={[6, 6, 0, 0]} name="ROM (°)" />
            <Bar dataKey="symmetry" fill="oklch(0.5 0.2 150)" radius={[6, 6, 0, 0]} name="Symmetry (%)" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data}>
          <defs>
            <linearGradient id="colorRom" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.65 0.18 255)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="oklch(0.65 0.18 255)" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorSym" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="oklch(0.5 0.2 150)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="oklch(0.5 0.2 150)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
          <XAxis 
            dataKey="date" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "oklch(0.65 0.02 240)", fontSize: 12 }} 
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: "oklch(0.65 0.02 240)", fontSize: 12 }} 
          />
          <Tooltip 
            contentStyle={{ backgroundColor: "oklch(0.16 0.02 240)", border: "none", borderRadius: "12px", color: "white" }}
            itemStyle={{ color: "white" }}
          />
          <Area 
            type="monotone" 
            dataKey="rom" 
            stroke="oklch(0.65 0.18 255)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorRom)" 
            name="ROM (°)"
          />
          <Area 
            type="monotone" 
            dataKey="symmetry" 
            stroke="oklch(0.5 0.2 150)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorSym)" 
            name="Symmetry (%)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
