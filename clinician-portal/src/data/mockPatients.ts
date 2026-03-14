import { Patient } from "@/types";

export const MOCK_PATIENTS: Patient[] = [
  {
    uid: "p1",
    email: "alex.johnson@example.com",
    displayName: "Alex Johnson",
    injuredSide: "LEFT",
    therapyGoal: "ACL Recovery - 120° Flexion",
    lastSessionAt: Date.now() - 1000 * 60 * 30, // 30 mins ago
    riskStatus: "high",
    recentSymmetry: 72,
    recentROM: 95,
    complianceScore: 45,
  },
  {
    uid: "p2",
    email: "sarah.smith@example.com",
    displayName: "Sarah Smith",
    injuredSide: "RIGHT",
    therapyGoal: "Meniscus Repair - Strength",
    lastSessionAt: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
    riskStatus: "low",
    recentSymmetry: 94,
    recentROM: 115,
    complianceScore: 98,
  },
  {
    uid: "p3",
    email: "mike.brown@example.com",
    displayName: "Mike Brown",
    injuredSide: "LEFT",
    therapyGoal: "Total Knee Replacement",
    lastSessionAt: Date.now() - 1000 * 60 * 60 * 24, // 1 day ago
    riskStatus: "medium",
    recentSymmetry: 85,
    recentROM: 88,
    complianceScore: 78,
  },
  {
    uid: "p4",
    email: "elena.gomez@example.com",
    displayName: "Elena Gomez",
    injuredSide: "RIGHT",
    therapyGoal: "MCL Strain - Stability",
    lastSessionAt: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
    riskStatus: "low",
    recentSymmetry: 91,
    recentROM: 110,
    complianceScore: 88,
  },
];
