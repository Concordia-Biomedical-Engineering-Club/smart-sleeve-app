import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useWorkoutSession } from "@/hooks/useWorkoutSession";
import {
  insertSession,
  fetchAllSessions,
  countEMGSamples,
} from "@/services/Database";
import type { Session } from "@/services/Database";

function makeDummySession(): Session {
  return {
    id: `session_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: "debug_user_001",
    exerciseType: "quad_sets",
    side: "LEFT",
    timestamp: Date.now(),
    duration: 300,
    avgFlexion: 72.5,
    exerciseIds: ["quad_sets", "straight_leg_raises"],
    synced: false,
    analytics: {
      avgActivation: 42.5,
      maxActivation: 87.3,
      deficitPercentage: 12.1,
      fatigueScore: 0.34,
      romDegrees: 95.0,
      exerciseQuality: 0.78,
    },
  };
}

export default function DebugDB() {
  const { sessionStatus, startRecording, endAndSave, recordingBufferLength } =
    useWorkoutSession();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [sampleCounts, setSampleCounts] = useState<Record<string, number>>({});
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) =>
    setLog((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev]);

  const handleCreateSession = async () => {
    setLoading(true);
    try {
      const session = makeDummySession();
      await insertSession(session);
      addLog(`✅ Created session: ${session.id}`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchSessions = async () => {
    setLoading(true);
    try {
      const result = await fetchAllSessions();
      setSessions(result);
      const counts: Record<string, number> = {};
      for (const s of result) {
        counts[s.id] = await countEMGSamples(s.id);
      }
      setSampleCounts(counts);
      addLog(`✅ Fetched ${result.length} session(s)`);
    } catch (e: any) {
      addLog(`❌ Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartRecording = () => {
    startRecording();
    addLog("🔴 Recording started — EMG frames being captured…");
  };

  const handleEndRecording = async () => {
    if (sessionStatus !== "RECORDING") return;
    addLog(`⏹ Ending session — ${recordingBufferLength} frames captured`);
    setLoading(true);
    try {
      const result = await endAndSave("debug_user_001");
      if (result) {
        addLog(
          `✅ Session saved in ${result.durationMs}ms — ${result.sampleCount} EMG samples`,
        );
        if (result.durationMs > 2000) {
          addLog(`⚠️ Save took over 2s — may need optimization`);
        }
        Alert.alert("Success", "Session Saved Successfully ☁️");
      }
    } catch (e: any) {
      addLog(`❌ Save failed: ${e.message}`);
      Alert.alert("Error", `Session Save Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🗄️ SQLite Debug Screen</Text>
      <Text style={styles.subtitle}>
        Issues #54 & #7 — expo-sqlite verification
      </Text>

      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.btn, styles.btnCreate]}
          onPress={handleCreateSession}
          disabled={loading}
        >
          <Text style={styles.btnText}>Create Test Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, styles.btnFetch]}
          onPress={handleFetchSessions}
          disabled={loading}
        >
          <Text style={styles.btnText}>Fetch Sessions</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor:
                sessionStatus === "RECORDING" ? "#E63946" : "#666",
            },
          ]}
          onPress={handleStartRecording}
          disabled={sessionStatus === "RECORDING" || loading}
        >
          <Text style={styles.btnText}>
            {sessionStatus === "RECORDING"
              ? `🔴 Recording (${recordingBufferLength})`
              : "Start Recording"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.btn,
            {
              backgroundColor:
                sessionStatus === "RECORDING" ? "#0B74E6" : "#999",
            },
          ]}
          onPress={handleEndRecording}
          disabled={sessionStatus !== "RECORDING" || loading}
        >
          <Text style={styles.btnText}>End & Save</Text>
        </TouchableOpacity>
      </View>

      {loading && <ActivityIndicator style={{ marginTop: 12 }} />}
      {sessions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sessions ({sessions.length})</Text>
          <ScrollView style={styles.dataBox}>
            {sessions.map((s) => (
              <View key={s.id} style={styles.sessionCard}>
                <Text style={styles.sessionId}>{s.id}</Text>
                <Text style={styles.sessionMeta}>
                  {s.exerciseType} | {s.side} | {s.duration}s
                </Text>
                <Text style={styles.sessionMeta}>
                  Avg Activation: {s.analytics.avgActivation.toFixed(1)}% | EMG
                  Samples: {sampleCounts[s.id] ?? "…"}
                </Text>
                <Text
                  style={[
                    styles.sessionSync,
                    { color: s.synced ? "#00A878" : "#E63946" },
                  ]}
                >
                  {s.synced ? "☁️ Synced" : "📴 Offline Queue"}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Log</Text>
        <ScrollView style={styles.logBox}>
          {log.length === 0 ? (
            <Text style={styles.logEmpty}>No activity yet.</Text>
          ) : (
            log.map((entry, i) => (
              <Text key={i} style={styles.logEntry}>
                {entry}
              </Text>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 60,
    backgroundColor: "#F8F9FA",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#1A1A1A" },
  subtitle: { fontSize: 13, color: "#666", marginBottom: 16 },
  btnRow: { flexDirection: "row", gap: 12, marginBottom: 8 },
  btn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  btnCreate: { backgroundColor: "#0B74E6" },
  btnFetch: { backgroundColor: "#00A878" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  section: { marginTop: 16, flex: 1 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  dataBox: {
    maxHeight: 200,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
  },
  sessionCard: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E1E3E5",
  },
  sessionId: {
    fontSize: 10,
    fontFamily: "monospace",
    color: "#666",
    marginBottom: 2,
  },
  sessionMeta: { fontSize: 12, color: "#1A1A1A", marginBottom: 1 },
  sessionSync: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  logBox: {
    backgroundColor: "#1A1A1A",
    borderRadius: 12,
    padding: 12,
    maxHeight: 180,
  },
  logEmpty: { color: "#666", fontSize: 12 },
  logEntry: {
    color: "#00FF88",
    fontSize: 11,
    fontFamily: "monospace",
    marginBottom: 2,
  },
});
