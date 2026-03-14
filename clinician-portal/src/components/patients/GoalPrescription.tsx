"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  CardFooter
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Target, Save, CheckCircle2 } from "lucide-react";
import { Patient } from "@/types";

interface GoalPrescriptionProps {
  patient: Patient;
}

export function GoalPrescription({ patient }: GoalPrescriptionProps) {
  const [goal, setGoal] = useState(patient.therapyGoal || "");
  const [targetROM, setTargetROM] = useState(patient.recentROM?.toString() || "120");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const patientRef = doc(db, "users", patient.uid);
      await updateDoc(patientRef, {
        therapyGoal: goal,
        targetROM: parseInt(targetROM),
        updatedAt: Date.now(),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      console.error("[GoalPrescription] Error saving goal:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-none bg-card/40 backdrop-blur-md">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Target className="h-5 w-5 text-primary" />
          <CardTitle>Therapy Protocol</CardTitle>
        </div>
        <CardDescription>Adjust the recovery targets for this patient.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="goal" className="text-sm font-semibold uppercase tracking-wider opacity-60">Primary Goal</Label>
          <Input 
            id="goal" 
            placeholder="e.g. ACL Recovery - Stage 2" 
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="bg-background/50 border-border/50 text-base"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="rom" className="text-sm font-semibold uppercase tracking-wider opacity-60">Target ROM (°)</Label>
            <Input 
              id="rom" 
              type="number"
              value={targetROM}
              onChange={(e) => setTargetROM(e.target.value)}
              className="bg-background/50 border-border/50"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-semibold uppercase tracking-wider opacity-60">Status</Label>
            <div className="h-10 flex items-center px-4 rounded-md bg-green-500/10 text-green-500 font-bold border border-green-500/20">
              Active Plan
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="pt-2">
        <Button 
          className="w-full gap-2 shadow-lg shadow-primary/20" 
          onClick={handleSave}
          disabled={loading}
        >
          {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          {loading ? "Saving..." : saved ? "Changes Saved" : "Save Protocol"}
        </Button>
      </CardFooter>
    </Card>
  );
}
