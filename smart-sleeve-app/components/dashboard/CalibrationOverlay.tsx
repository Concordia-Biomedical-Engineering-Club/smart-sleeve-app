import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Animated } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors } from '@/constants/theme';
import type { CalibrationCoefficients } from '@/store/userSlice';
import {
  startBaseline, startMVC, addFrame, finalizeBaseline,
  finalizeMVC, buildCoefficients, reset, BASELINE_DURATION_SEC,
} from '@/services/NormalizationService';

const MVC_DURATION_SEC = 5;
const CHANNEL_LABELS = ['VMO', 'VL', 'RF', 'BF'];
type CalibrationPhase = 'intro' | 'rest' | 'flex' | 'confirm' | 'error';

interface CalibrationOverlayProps {
  visible: boolean;
  liveRMS: number[];
  onComplete: (coeffs: CalibrationCoefficients) => void;
  onDismiss: () => void;
}

export default function CalibrationOverlay({ visible, liveRMS, onComplete, onDismiss }: CalibrationOverlayProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];
  const [phase, setPhase] = useState<CalibrationPhase>('intro');
  const [countdown, setCountdown] = useState(0);
  const [baseline, setBaseline] = useState<number[] | null>(null);
  const [mvc, setMVC] = useState<number[] | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const progressAnim = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if ((phase === 'rest' || phase === 'flex') && liveRMS.length > 0) addFrame(liveRMS);
  }, [liveRMS, phase]);

  useEffect(() => {
    if (visible) {
      reset(); setPhase('intro'); setBaseline(null); setMVC(null);
      setErrorMsg(''); progressAnim.setValue(0);
    }
  }, [visible]);

  useEffect(() => { return () => { if (countdownRef.current) clearInterval(countdownRef.current); }; }, []);

  const runCountdown = useCallback((duration: number, onDone: () => void) => {
    progressAnim.setValue(0);
    Animated.timing(progressAnim, { toValue: 1, duration: duration * 1000, useNativeDriver: false }).start();
    let remaining = duration;
    setCountdown(remaining);
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) { clearInterval(countdownRef.current!); onDone(); }
    }, 1000);
  }, []);

  const startRestPhase = useCallback(() => {
    reset(); startBaseline(); setPhase('rest');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    runCountdown(BASELINE_DURATION_SEC, () => {
      try { const b = finalizeBaseline(); setBaseline(b); startMVCPhase(b); }
      catch { setErrorMsg('Baseline capture failed. Please try again.'); setPhase('error'); }
    });
  }, []);

  const startMVCPhase = useCallback((b?: number[]) => {
    startMVC(); setPhase('flex');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    runCountdown(MVC_DURATION_SEC, () => {
      try { const m = finalizeMVC(); setMVC(m); setPhase('confirm'); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); }
      catch { setErrorMsg('MVC capture failed. Please flex harder and try again.'); setPhase('error'); }
    });
  }, []);

  const handleConfirm = useCallback(() => {
    if (!baseline || !mvc) return;
    onComplete(buildCoefficients(baseline, mvc));
  }, [baseline, mvc, onComplete]);

  const handleRetry = useCallback(() => {
    reset(); setPhase('intro'); setBaseline(null); setMVC(null); setErrorMsg(''); progressAnim.setValue(0);
  }, []);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const renderChannelRow = (values: number[]) => (
    <View style={styles.channelGrid}>
      {CHANNEL_LABELS.map((ch, i) => (
        <View key={ch} style={[styles.channelChip, { borderColor: theme.border }]}>
          <Text style={[styles.channelLabel, { color: theme.textSecondary }]}>{ch}</Text>
          <Text style={[styles.channelValue, { color: theme.text }]}>{values[i]?.toFixed(3) ?? '—'}</Text>
        </View>
      ))}
    </View>
  );

  const renderPhase = () => {
    switch (phase) {
      case 'intro': return (
        <>
          <Text style={[styles.title, { color: theme.text }]}>🎯 Calibration</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>A 2-step process to personalise your signal readings.</Text>
          <View style={[styles.stepCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.stepTitle, { color: theme.tint }]}>Step 1 — Rest (5s)</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>Sit still with your leg relaxed. We measure your muscle noise floor.</Text>
          </View>
          <View style={[styles.stepCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.stepTitle, { color: theme.success }]}>Step 2 — Flex (5s)</Text>
            <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>Contract your quad as hard as possible. This sets your 100% MVC reference point.</Text>
          </View>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.tint }]} onPress={startRestPhase}>
            <Text style={styles.primaryBtnText}>Start Calibration</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </>
      );
      case 'rest': return (
        <>
          <Text style={[styles.phaseLabel, { color: theme.tint }]}>STEP 1 OF 2</Text>
          <Text style={[styles.title, { color: theme.text }]}>😌 Relax</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Keep your leg completely still and relaxed.</Text>
          <Text style={[styles.countdown, { color: theme.tint }]}>{countdown}s</Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: theme.tint }]} />
          </View>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Measuring baseline noise floor…</Text>
        </>
      );
      case 'flex': return (
        <>
          <Text style={[styles.phaseLabel, { color: theme.success }]}>STEP 2 OF 2</Text>
          <Text style={[styles.title, { color: theme.text }]}>💪 FLEX NOW</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Contract your quad as hard as you can and hold it!</Text>
          <Text style={[styles.countdown, { color: theme.success }]}>{countdown}s</Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <Animated.View style={[styles.progressBar, { width: progressWidth, backgroundColor: theme.success }]} />
          </View>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>Hold maximum contraction…</Text>
        </>
      );
      case 'confirm': return (
        <>
          <Text style={[styles.title, { color: theme.text }]}>✅ Calibration Complete</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Review your values. Confirm to enable Clinical % MVC mode.</Text>
          {baseline && <View style={styles.resultBlock}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>Baseline (Rest) — μV RMS</Text>
            {renderChannelRow(baseline)}
          </View>}
          {mvc && <View style={styles.resultBlock}>
            <Text style={[styles.resultLabel, { color: theme.textSecondary }]}>MVC Peak (500ms window) — μV RMS</Text>
            {renderChannelRow(mvc)}
          </View>}
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.success }]} onPress={handleConfirm}>
            <Text style={styles.primaryBtnText}>Save & Enable % MVC</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={handleRetry}>
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Retry</Text>
          </TouchableOpacity>
        </>
      );
      case 'error': return (
        <>
          <Text style={[styles.title, { color: theme.warning }]}>⚠️ Calibration Failed</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{errorMsg}</Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.tint }]} onPress={handleRetry}>
            <Text style={styles.primaryBtnText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onDismiss}>
            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </>
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onDismiss}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: theme.background }]}>
          {renderPhase()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 28, paddingBottom: 48, gap: 16, minHeight: '60%' },
  phaseLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  title: { fontSize: 26, fontWeight: '700' },
  subtitle: { fontSize: 15, lineHeight: 22 },
  countdown: { fontSize: 72, fontWeight: '800', textAlign: 'center', marginVertical: 8 },
  progressTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  progressBar: { height: 8, borderRadius: 4 },
  hint: { fontSize: 13, textAlign: 'center', fontStyle: 'italic' },
  stepCard: { borderRadius: 14, padding: 16, gap: 6 },
  stepTitle: { fontSize: 15, fontWeight: '700' },
  stepDesc: { fontSize: 13, lineHeight: 19 },
  resultBlock: { gap: 8 },
  resultLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  channelGrid: { flexDirection: 'row', gap: 8 },
  channelChip: { flex: 1, borderWidth: 1, borderRadius: 10, padding: 10, alignItems: 'center', gap: 4 },
  channelLabel: { fontSize: 11, fontWeight: '600' },
  channelValue: { fontSize: 13, fontWeight: '700' },
  primaryBtn: { borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  secondaryBtn: { borderRadius: 14, paddingVertical: 14, alignItems: 'center', borderWidth: 1 },
  secondaryBtnText: { fontWeight: '600', fontSize: 15 },
  cancelBtn: { alignItems: 'center', paddingVertical: 8 },
  cancelBtnText: { fontSize: 14 },
});