import React, { useEffect, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useColors } from '@/hooks/useColors';

interface PromptModalProps {
  visible: boolean;
  title: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (value: string) => void;
}

export function PromptModal({
  visible,
  title,
  placeholder,
  initialValue,
  confirmLabel = 'Save',
  onCancel,
  onConfirm,
}: PromptModalProps) {
  const colors = useColors();
  const [value, setValue] = useState(initialValue ?? '');

  useEffect(() => {
    if (visible) {
      setValue(initialValue ?? '');
    }
  }, [visible, initialValue]);

  const trimmed = value.trim();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderRadius: colors.radius, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
          <TextInput
            value={value}
            onChangeText={setValue}
            placeholder={placeholder}
            placeholderTextColor={colors.mutedForeground}
            autoFocus
            selectTextOnFocus
            style={[
              styles.input,
              {
                backgroundColor: colors.input,
                color: colors.foreground,
                borderRadius: Math.min(colors.radius, 12),
              },
            ]}
            returnKeyType="done"
            onSubmitEditing={() => trimmed && onConfirm(trimmed)}
          />
          <View style={styles.actions}>
            <Pressable
              onPress={onCancel}
              style={({ pressed }) => [
                styles.button,
                { backgroundColor: colors.secondary, opacity: pressed ? 0.8 : 1 },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.secondaryForeground }]}>
                Cancel
              </Text>
            </Pressable>
            <Pressable
              disabled={!trimmed}
              onPress={() => onConfirm(trimmed)}
              style={({ pressed }) => [
                styles.button,
                {
                  backgroundColor: colors.primary,
                  opacity: !trimmed ? 0.5 : pressed ? 0.85 : 1,
                },
              ]}
            >
              <Text style={[styles.buttonLabel, { color: colors.primaryForeground }]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 14,
  },
  title: {
    fontSize: 17,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
  input: {
    height: 46,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonLabel: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    fontWeight: '600',
  },
});
