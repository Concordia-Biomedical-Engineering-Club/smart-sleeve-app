"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { TrendingDown, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Patient } from "@/types";

interface PatientTableProps {
  patients: Patient[];
  className?: string;
}

export function PatientTable({ patients, className }: PatientTableProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/40 overflow-hidden bg-card/40 backdrop-blur-md",
        className,
      )}
    >
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
          {patients.map((patient) => (
            <TableRow
              key={patient.uid}
              className="group border-border/40 hover:bg-accent/30 transition-colors"
            >
              <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 ring-2 ring-background ring-offset-2 ring-offset-border/10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${patient.displayName}`}
                    />
                    <AvatarFallback>
                      {patient.displayName?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-semibold">{patient.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {patient.therapyGoal}
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={cn(
                    "rounded-full px-3 py-1 font-medium capitalize border-none",
                    patient.riskStatus === "high"
                      ? "bg-red-500/10 text-red-500"
                      : patient.riskStatus === "medium"
                        ? "bg-amber-500/10 text-amber-500"
                        : "bg-green-500/10 text-green-500",
                  )}
                >
                  <div
                    className={cn(
                      "w-1.5 h-1.5 rounded-full mr-2",
                      patient.riskStatus === "high"
                        ? "bg-red-500"
                        : patient.riskStatus === "medium"
                          ? "bg-amber-500"
                          : "bg-green-500",
                    )}
                  />
                  {patient.riskStatus}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">
                    {patient.recentSymmetry}%
                  </span>
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
                {patient.lastSessionAt
                  ? formatDistanceToNow(new Date(patient.lastSessionAt), {
                      addSuffix: true,
                    })
                  : "N/A"}
              </TableCell>
              <TableCell className="text-right">
                <Link href={`/patients/${patient.uid}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="group-hover:bg-primary group-hover:text-primary-foreground rounded-lg transition-all"
                  >
                    View Profile
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </TableCell>
            </TableRow>
          ))}
          {patients.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={6}
                className="h-32 text-center text-muted-foreground"
              >
                No patients found matching the criteria.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
