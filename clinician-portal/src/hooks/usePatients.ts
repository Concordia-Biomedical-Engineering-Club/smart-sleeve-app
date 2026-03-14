"use client";

import { useState, useEffect } from "react";
import { collection, query, getDocs, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Patient } from "@/types";

export function usePatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // In a real production app, we might filter by a 'clinicianId' field
    // or use a specific collection of "assigned_patients".
    // For this competition demo, we scan the 'users' collection.
    const q = query(collection(db, "users"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const patientList: Patient[] = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          uid: doc.id,
          email: data.email || null,
          displayName: data.displayName || "Unknown Patient",
          injuredSide: data.injuredSide || null,
          therapyGoal: data.therapyGoal || "Recovery",
          lastSessionAt: data.lastSyncedAt || data.updatedAt || null,
          riskStatus: calculateRiskStatus(data),
          recentSymmetry: data.recentSymmetry || null,
          recentROM: data.recentROM || null,
        } as Patient;
      });
      
      setPatients(patientList);
      setLoading(false);
    }, (err) => {
      console.error("[usePatients] Error:", err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { patients, loading, error };
}

function calculateRiskStatus(data: any): "low" | "medium" | "high" {
  // Simple heuristic for the demo
  const symmetry = data.recentSymmetry || 95;
  const compliance = data.complianceScore || 100;

  if (symmetry < 75 || compliance < 50) return "high";
  if (symmetry < 85 || compliance < 80) return "medium";
  return "low";
}
