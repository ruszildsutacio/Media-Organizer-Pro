import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';

export interface ActionMenuOption {
  key: string;
  label: string;
  icon: keyof typeof Feather.glyphMap;
  destructive?: boolean;
  onPress: () => void;
}

interface ActionMenuProps {
  visible: boolean;
  title?: string;
  options: ActionMenuOption[];
  onClose: () => void;
}

export function ActionMenu({ visible, title, options, onClose }: ActionMenuProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.sheet,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingBottom: Math.max(insets.bottom, 16),
              borderRadius: colors.radius,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          {title ? (
            <Text style={[styles.title, { color: colors.mutedForeground }]}>{title}</Text>
          ) : null}
          {options.map((option, index) => (
            <Pressable
              key={option.key}
              onPress={() => {
                onClose();
                option.onPress();
              }}
              style={({ pressed }) => [
                styles.row,
                index < options.length - 1 && {
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border,
                },
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Feather
                name={option.icon}
                size={19}
                color={option.destructive ? colors.destructive : colors.foreground}
              />
              <Text
                style={[
                  styles.label,
                  { color: option.destructive ? colors.destructive : colors.foreground },
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
          <Pressable
            onPress={onClose}
            style={({ pressed }) => [
              styles.cancel,
              { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Text style={[styles.cancelLabel, { color: colors.secondaryForeground }]}>
              Cancel
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    marginHorizontal: 12,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    paddingHorizontal: 8,
    overflow: 'hidden',
  },
  title: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  label: {
    fontSize: 16,
    fontFamily: 'Inter_500Medium',
  },
  cancel: {
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelLabel: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
});
