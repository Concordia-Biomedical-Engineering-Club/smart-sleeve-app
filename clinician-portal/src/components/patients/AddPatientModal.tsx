"use client";

import { useState } from "react";
import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  limit,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X, UserPlus, CheckCircle2, AlertCircle, Search } from "lucide-react";

interface AddPatientModalProps {
  onClose: () => void;
}

type Step = "form" | "preview" | "success";

export function AddPatientModal({ onClose }: AddPatientModalProps) {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingData, setExistingData] = useState<Record<string, any> | null>(
    null,
  );
  const [resolvedUid, setResolvedUid] = useState("");

  const [formData, setFormData] = useState({
    identifier: "",
    displayName: "",
    email: "",
    injuredSide: "LEFT" as "LEFT" | "RIGHT",
    therapyGoal: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError(null);
  };

  // Look up by UID or email first — if a user document exists, prefill fields.
  const handleLookup = async () => {
    const identifier = formData.identifier.trim();
    if (!identifier) {
      setError("Enter a patient UID or email to look up.");
      return;
    }

    const looksLikeEmail = identifier.includes("@");
    setLoading(true);
    setError(null);
    try {
      if (looksLikeEmail) {
        const email = identifier.toLowerCase();
        const q = query(
          collection(db, "users"),
          where("email", "==", email),
          limit(2),
        );
        const querySnap = await getDocs(q);

        if (querySnap.empty) {
          setError(
            "No user found with this email. Ask the patient to log into the mobile app and sync once, then try again.",
          );
          return;
        }

        if (querySnap.docs.length > 1) {
          setError(
            "Multiple users match this email. Use the patient's UID to avoid ambiguity.",
          );
          return;
        }

        const matchedDoc = querySnap.docs[0];
        const data = matchedDoc.data();
        setResolvedUid(matchedDoc.id);
        setExistingData(data);
        setFormData((prev) => ({
          ...prev,
          email: email,
          displayName: data.displayName || prev.displayName,
          injuredSide: data.injuredSide || prev.injuredSide,
          therapyGoal: data.therapyGoal || prev.therapyGoal,
        }));
      } else {
        const snap = await getDoc(doc(db, "users", identifier));
        setResolvedUid(identifier);
        if (snap.exists()) {
          const data = snap.data();
          setExistingData(data);
          setFormData((prev) => ({
            ...prev,
            email: data.email || prev.email,
            displayName: data.displayName || prev.displayName,
            injuredSide: data.injuredSide || prev.injuredSide,
            therapyGoal: data.therapyGoal || prev.therapyGoal,
          }));
        } else {
          setExistingData(null);
        }
      }

      setStep("preview");
    } catch (err: any) {
      setError(err.message || "Failed to look up patient.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!resolvedUid.trim() || !formData.displayName.trim()) {
      setError("A valid UID/email lookup and Display Name are required.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await setDoc(
        doc(db, "users", resolvedUid.trim()),
        {
          uid: resolvedUid.trim(),
          displayName: formData.displayName.trim(),
          email: formData.email.trim() || null,
          injuredSide: formData.injuredSide,
          therapyGoal: formData.therapyGoal.trim() || "Recovery",
          lastSyncedAt: null,
          recentROM: null,
          recentSymmetry: null,
          complianceScore: null,
          createdByClinicianAt: Date.now(),
        },
        { merge: true },
      );
      setStep("success");
    } catch (err: any) {
      setError(err.message || "Failed to create patient record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-lg border-none bg-card/80 backdrop-blur-xl shadow-2xl mx-4">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-blue-400 rounded-t-xl" />

        <CardHeader className="relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-accent transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <CardTitle>Add Patient</CardTitle>
          </div>
          <CardDescription>
            {step === "form" &&
              "Enter the patient's email or Firebase UID to link them to this portal."}
            {step === "preview" &&
              "Review the patient details before saving to the portal."}
            {step === "success" && "Patient added successfully."}
          </CardDescription>
        </CardHeader>

        {step === "success" ? (
          <CardContent className="flex flex-col items-center py-10 gap-4">
            <div className="p-5 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-12 w-12 text-green-500" />
            </div>
            <p className="text-lg font-bold">
              {formData.displayName} is now in your patient list.
            </p>
            <p className="text-sm text-muted-foreground text-center">
              Their sessions will appear automatically the next time they sync
              from the Smart Sleeve app.
            </p>
            <Button
              className="w-full mt-4 rounded-xl shadow-lg shadow-primary/20"
              onClick={onClose}
            >
              Done
            </Button>
          </CardContent>
        ) : (
          <>
            <CardContent className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Identifier field — accepts UID or email */}
              <div className="space-y-2">
                <Label
                  htmlFor="identifier"
                  className="text-xs font-semibold uppercase tracking-wider opacity-60"
                >
                  Patient Email or Firebase UID
                </Label>
                <div className="flex gap-2">
                  <Input
                    id="identifier"
                    name="identifier"
                    placeholder="e.g. athlete@email.com or abc123XYZ..."
                    value={formData.identifier}
                    onChange={handleChange}
                    disabled={step === "preview"}
                    className="bg-background/50 border-border/50 text-sm"
                  />
                  {step === "form" && (
                    <Button
                      variant="outline"
                      className="shrink-0 gap-2 border-border/50"
                      onClick={handleLookup}
                      disabled={loading}
                    >
                      <Search className="h-4 w-4" />
                      Look up
                    </Button>
                  )}
                </div>
                {step === "form" && (
                  <p className="text-xs text-muted-foreground">
                    Enter patient email first. If no result is found, use UID
                    from the patient app Profile → Account ID.
                  </p>
                )}
                {step === "preview" && !!resolvedUid && (
                  <p className="text-xs text-muted-foreground font-mono">
                    Resolved UID: {resolvedUid}
                  </p>
                )}
                {existingData && step === "preview" && (
                  <p className="text-xs text-green-500 font-medium">
                    ✓ Existing account found — fields pre-filled from Firestore.
                  </p>
                )}
                {!existingData && step === "preview" && (
                  <p className="text-xs text-amber-500 font-medium">
                    No existing Firestore document — a new stub record will be
                    created.
                  </p>
                )}
              </div>

              {step === "preview" && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="displayName"
                        className="text-xs font-semibold uppercase tracking-wider opacity-60"
                      >
                        Display Name
                      </Label>
                      <Input
                        id="displayName"
                        name="displayName"
                        placeholder="e.g. Alex Johnson"
                        value={formData.displayName}
                        onChange={handleChange}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-xs font-semibold uppercase tracking-wider opacity-60"
                      >
                        Email (optional)
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="patient@email.com"
                        value={formData.email}
                        onChange={handleChange}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="injuredSide"
                        className="text-xs font-semibold uppercase tracking-wider opacity-60"
                      >
                        Injured Side
                      </Label>
                      <select
                        id="injuredSide"
                        name="injuredSide"
                        value={formData.injuredSide}
                        onChange={handleChange}
                        className="w-full h-10 px-3 rounded-lg bg-background/50 border border-border/50 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/30"
                      >
                        <option value="LEFT">Left</option>
                        <option value="RIGHT">Right</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label
                        htmlFor="therapyGoal"
                        className="text-xs font-semibold uppercase tracking-wider opacity-60"
                      >
                        Therapy Goal
                      </Label>
                      <Input
                        id="therapyGoal"
                        name="therapyGoal"
                        placeholder="e.g. ACL Recovery"
                        value={formData.therapyGoal}
                        onChange={handleChange}
                        className="bg-background/50 border-border/50"
                      />
                    </div>
                  </div>
                </>
              )}
            </CardContent>

            <CardFooter className="flex gap-3 pt-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl border-border/50"
                onClick={step === "preview" ? () => setStep("form") : onClose}
              >
                {step === "preview" ? "Back" : "Cancel"}
              </Button>
              {step === "preview" && (
                <Button
                  className="flex-1 rounded-xl shadow-lg shadow-primary/20"
                  onClick={handleCreate}
                  disabled={loading}
                >
                  {loading ? "Saving..." : "Add to Portal"}
                </Button>
              )}
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
