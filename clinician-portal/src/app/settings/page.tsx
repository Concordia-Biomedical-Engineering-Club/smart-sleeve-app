"use client";

import { useEffect, useState } from "react";
import {
  User,
  Building,
  Shield,
  Bell,
  CreditCard,
  ChevronRight,
  Stethoscope,
  Mail,
  Globe,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/components/auth/AuthProvider";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";

type SettingsSection =
  | "profile"
  | "clinic"
  | "security"
  | "notifications"
  | "billing";

export default function SettingsPage() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("profile");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: "Dr. Sarah Evans",
    npiNumber: "1284950284",
    clinicName: "Concordia Orthopedics & Sports Med",
    website: "https://concordiaortho.com",
  });
  const [initialFormData, setInitialFormData] = useState(formData);

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.uid) return;
      try {
        const snap = await getDoc(doc(db, "clinicians", user.uid));
        if (!snap.exists()) return;
        const data = snap.data();
        const loaded = {
          fullName: data.fullName || user.displayName || "Dr. Sarah Evans",
          npiNumber: data.npiNumber || "1284950284",
          clinicName: data.clinicName || "Concordia Orthopedics & Sports Med",
          website: data.website || "https://concordiaortho.com",
        };
        setFormData(loaded);
        setInitialFormData(loaded);
      } catch (err: any) {
        setError(err.message || "Failed to load clinician profile.");
      }
    };

    void loadProfile();
  }, [user?.uid, user?.displayName]);

  const handleInputChange = (key: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleCancel = () => {
    setFormData(initialFormData);
    setSaved(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!user?.uid) {
      setError("You must be signed in to save settings.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await setDoc(
        doc(db, "clinicians", user.uid),
        {
          uid: user.uid,
          email: user.email ?? null,
          role: "clinician",
          fullName: formData.fullName,
          npiNumber: formData.npiNumber,
          clinicName: formData.clinicName,
          website: formData.website,
          updatedAt: Date.now(),
        },
        { merge: true },
      );
      setInitialFormData(formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err: any) {
      setError(err.message || "Failed to save settings.");
    } finally {
      setLoading(false);
    }
  };

  const sections: Array<{ name: string; icon: any; key: SettingsSection }> = [
    { name: "Clinical Profile", icon: User, key: "profile" },
    { name: "Clinic Information", icon: Building, key: "clinic" },
    { name: "Security & Privacy", icon: Shield, key: "security" },
    { name: "Portal Notifications", icon: Bell, key: "notifications" },
    { name: "Billing & Plans", icon: CreditCard, key: "billing" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">
          Portal Settings
        </h1>
        <p className="text-muted-foreground">
          Manage your clinical profile, institution details, and notification
          preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 space-y-4">
          {sections.map((item) => (
            <button
              key={item.key}
              onClick={() => setActiveSection(item.key)}
              className={cn(
                "w-full flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all",
                activeSection === item.key
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "hover:bg-accent text-muted-foreground hover:text-accent-foreground",
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.name}</span>
              </div>
              {activeSection === item.key && (
                <ChevronRight className="h-4 w-4" />
              )}
            </button>
          ))}
        </div>

        <Card className="md:col-span-2 border-none bg-card/40 backdrop-blur-md">
          <CardHeader>
            <CardTitle>
              {activeSection === "profile" && "Professional Profile"}
              {activeSection === "clinic" && "Clinic Information"}
              {activeSection === "security" && "Security & Privacy"}
              {activeSection === "notifications" && "Portal Notifications"}
              {activeSection === "billing" && "Billing & Plans"}
            </CardTitle>
            <CardDescription>
              {activeSection === "profile" &&
                "Your details as they appear on patient clearance reports and certificates."}
              {activeSection !== "profile" &&
                "This section is now clickable and wired; full controls can be added next."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {activeSection === "profile" ? (
              <>
                <div className="flex flex-col md:flex-row gap-6">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="name">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input
                        id="name"
                        value={formData.fullName}
                        onChange={(e) =>
                          handleInputChange("fullName", e.target.value)
                        }
                        className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl"
                      />
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="npi">NPI Number / Professional ID</Label>
                    <div className="relative">
                      <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                      <Input
                        id="npi"
                        value={formData.npiNumber}
                        onChange={(e) =>
                          handleInputChange("npiNumber", e.target.value)
                        }
                        className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Work Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      id="email"
                      defaultValue={user?.email || ""}
                      disabled
                      className="pl-10 bg-muted/30 border-border/50 h-11 rounded-xl opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clinic">Primary Clinic</Label>
                  <div className="relative">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      id="clinic"
                      value={formData.clinicName}
                      onChange={(e) =>
                        handleInputChange("clinicName", e.target.value)
                      }
                      className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="website">Clinic Website</Label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                    <Input
                      id="website"
                      value={formData.website}
                      onChange={(e) =>
                        handleInputChange("website", e.target.value)
                      }
                      className="pl-10 bg-background/50 border-border/50 h-11 rounded-xl"
                    />
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl border border-border/40 bg-background/30 px-4 py-8 text-center text-muted-foreground text-sm">
                This section is active and selectable. Detailed controls for
                this section are coming next.
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-6 border-t border-border/20 flex justify-end gap-3">
            {activeSection === "profile" ? (
              <>
                <Button
                  variant="ghost"
                  className="rounded-xl"
                  onClick={handleCancel}
                >
                  Cancel Changes
                </Button>
                <Button
                  className="rounded-xl px-8 shadow-lg shadow-primary/20"
                  onClick={handleSave}
                  disabled={loading}
                >
                  {loading ? "Saving..." : saved ? "Saved" : "Save Profile"}
                </Button>
              </>
            ) : (
              <Button variant="ghost" className="rounded-xl" disabled>
                No changes to save in this section
              </Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
