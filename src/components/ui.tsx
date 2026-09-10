import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { useApp } from '@/state/AppContext';

export const ThemedText: React.FC<
  React.ComponentProps<typeof Text> & { color?: keyof import('@/theme').ThemeColors }
> = ({ style, color, ...props }) => {
  const { theme } = useApp();
  return (
    <Text
      {...props}
      style={[{ color: color ? theme[color] : theme.textPrimary }, style as any]}
    />
  );
};

export const ThemedInput: React.FC<React.ComponentProps<typeof TextInput>> = ({
  style,
  ...props
}) => {
  const { theme } = useApp();
  return (
    <TextInput
      placeholderTextColor={theme.textMuted}
      {...props}
      style={[
        styles.input,
        {
          color: theme.textPrimary,
          borderColor: theme.border,
          backgroundColor: theme.surfaceInput,
        },
        style,
      ]}
    />
  );
};

export const Toggle: React.FC<{ value: boolean; onValueChange: (v: boolean) => void }> = ({
  value,
  onValueChange,
}) => {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={() => onValueChange(!value)}
      style={[
        styles.toggleTrack,
        {
          backgroundColor: value ? theme.accent : theme.border,
        },
      ]}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
    >
      <View
        style={[
          styles.toggleThumb,
          {
            backgroundColor: '#ffffff',
            transform: [{ translateX: value ? 22 : 0 }],
          },
        ]}
      />
    </Pressable>
  );
};

export const Section: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => {
  const { theme } = useApp();
  return (
    <View style={[styles.section, { borderBottomColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>{title}</Text>
      {children}
    </View>
  );
};

export const Row: React.FC<{
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
}> = ({ label, description, right, onPress }) => {
  const { theme } = useApp();
  const content = (
    <View style={styles.rowInner}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textPrimary, fontSize: 15 }}>{label}</Text>
        {description ? (
          <Text style={{ color: theme.textMuted, fontSize: 12, marginTop: 2 }}>
            {description}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          { opacity: pressed ? 0.6 : 1 },
        ]}
      >
        {content}
      </Pressable>
    );
  }

  return content;
};

export const PrimaryButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}> = ({ title, onPress, disabled, loading, style }) => {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        {
          backgroundColor: theme.accent,
          opacity: disabled || loading ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#fff" size="small" />
      ) : (
        <Text style={styles.primaryButtonText}>{title}</Text>
      )}
    </Pressable>
  );
};

export const GhostButton: React.FC<{
  title: string;
  onPress: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}> = ({ title, onPress, disabled, style, textStyle }) => {
  const { theme } = useApp();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.ghostButton,
        {
          borderColor: theme.border,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <Text style={[{ color: theme.textSecondary }, textStyle]}>{title}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  toggleTrack: {
    width: 48,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  section: {
    borderBottomWidth: 1,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  primaryButton: {
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  ghostButton: {
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
});