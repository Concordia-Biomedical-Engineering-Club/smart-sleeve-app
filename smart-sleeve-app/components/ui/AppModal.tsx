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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  modalBox: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)', // This will be overridden by borderTopColor in inline style
    paddingTop: 12,
    maxHeight: '92%',
    ...Shadows.card,
  },
  modalHandle: {
    width: 36,
    height: 5,
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 24,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: 8,
    fontSize: 22,
    fontWeight: '700',
  },
  modalSubtitle: {
    textAlign: 'center',
    fontSize: 14,
    marginBottom: 32,
    lineHeight: 20,
    opacity: 0.8,
  },
  content: {
    gap: 20,
  },
  footer: {
    padding: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.03)',
    gap: 12,
    ...Platform.select({
      ios: { paddingBottom: 44 },
      android: { paddingBottom: 24 }
    })
  },
});
