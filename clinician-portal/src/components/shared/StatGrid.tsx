"use client";

import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatItem {
  name: string;
  value: string;
  icon: LucideIcon;
  color: string;
  bg: string;
  description?: string;
}

interface StatGridProps {
  stats: StatItem[];
  className?: string;
}

export function StatGrid({ stats, className }: StatGridProps) {
  return (
    <div className={cn("grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", className)}>
      {stats.map((stat) => (
        <Card key={stat.name} className="border-none bg-card/40 backdrop-blur-md overflow-hidden animate-in zoom-in duration-300">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">{stat.name}</p>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                {stat.description && (
                  <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                )}
              </div>
              <div className={cn("p-4 rounded-2xl transition-transform hover:scale-110 duration-300", stat.bg)}>
                <stat.icon className={cn("h-6 w-6 text-foreground", stat.color)} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
