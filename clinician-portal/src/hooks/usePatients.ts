"use client";

import { useState, useEffect } from "react";
import { collection, query, onSnapshot } from "firebase/firestore";
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

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const patientList: Patient[] = snapshot.docs.map((doc) => {
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
      },
      (err) => {
        console.error("[usePatients] Error:", err);
        setError(err.message);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, []);

  return { patients, loading, error };
}

function calculateRiskStatus(data: any): "low" | "medium" | "high" {
  const symmetry: number | null = data.recentSymmetry ?? null;
  const compliance: number | null = data.complianceScore ?? null;

  // No recorded data is unknown — treat as high risk to ensure clinical review
  if (symmetry === null && compliance === null) return "high";
  if (symmetry !== null && symmetry < 75) return "high";
  if (compliance !== null && compliance < 50) return "high";
  if (symmetry !== null && symmetry < 85) return "medium";
  if (compliance !== null && compliance < 80) return "medium";
  return "low";
}
