import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Colors, Shadows } from '@/constants/theme';
import { ThemedText } from '../themed-text';

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Standardized "Sheet" Modal for the smart-sleeve-app.
 * Provides a consistent look with a top handle, rounded corners, and backdrop.
 */
export function AppModal({
  visible,
  onClose,
  title,
  subtitle,
  children,
  footer,
}: AppModalProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const theme = Colors[colorScheme];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity 
          style={styles.dismissArea} 
          activeOpacity={1} 
          onPress={onClose} 
        />
        
        <View style={[styles.modalBox, { backgroundColor: theme.cardBackground }]}>
          {/* Top Grab Handle */}
          <View style={[styles.modalHandle, { backgroundColor: colorScheme === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)' }]} />
          
          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {title && (
              <ThemedText type="subtitle" style={styles.modalTitle}>
                {title}
              </ThemedText>
            )}
            
            {subtitle && (
              <ThemedText style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
                {subtitle}
              </ThemedText>
            )}

            <View style={styles.content}>
              {children}
            </View>
          </ScrollView>

          {/* Optional Fixed Footer (e.g., action buttons) */}
          {footer && (
            <View style={styles.footer}>
              {footer}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  modalBox: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    maxHeight: '90%',
    ...Shadows.card,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    textAlign: 'center',
    fontSize: 15,
    marginBottom: 24,
    lineHeight: 20,
  },
  content: {
    gap: 16,
  },
  footer: {
    padding: 24,
    paddingTop: 0,
    gap: 12,
    ...Platform.select({
      ios: { paddingBottom: 40 },
      android: { paddingBottom: 24 }
    })
  },
});
