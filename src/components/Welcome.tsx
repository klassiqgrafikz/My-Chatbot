import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/state/AppContext';

const SUGGESTIONS = [
  {
    icon: 'bulb-outline' as const,
    text: 'Explain something simply',
  },
  {
    icon: 'code-slash-outline' as const,
    text: 'Help me write code',
  },
  {
    icon: 'create-outline' as const,
    text: 'Draft an email',
  },
  {
    icon: 'telescope-outline' as const,
    text: 'Plan a project',
  },
];

const BRAND_ICON = require('../../assets/icon.png');

export const Welcome: React.FC = () => {
  const { theme, handleSend } = useApp();

  const sendPrompt = (text: string) => {
    handleSend({ role: 'user', content: text });
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.brandWrap, { backgroundColor: theme.surface }]}>
        <Image source={BRAND_ICON} style={styles.brand} resizeMode="cover" />
      </View>
      <Text style={[styles.title, { color: theme.textPrimary }]}>
        What can I help with?
      </Text>

      <View style={styles.grid}>
        {SUGGESTIONS.map((s) => (
          <Pressable
            key={s.text}
            onPress={() => sendPrompt(s.text)}
            style={({ pressed }) => [
              styles.card,
              {
                backgroundColor: theme.surfaceAlt,
                borderColor: theme.border,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <View style={[styles.iconCircle, { backgroundColor: theme.surface }]}>
              <Ionicons name={s.icon} size={18} color={theme.accent} />
            </View>
            <Text style={[styles.cardText, { color: theme.textSecondary }]}>
              {s.text}
            </Text>
            <Ionicons name="arrow-forward-outline" size={18} color={theme.textMuted} />
          </Pressable>
        ))}
      </View>

      <Text
        style={[styles.hint, { color: theme.textMuted, alignSelf: 'center' }]}
      >
        Set your backend URL in Settings first.
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  brandWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    marginBottom: 20,
  },
  brand: {
    width: 56,
    height: 56,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    alignSelf: 'center',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    maxWidth: 560,
    alignSelf: 'center',
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    width: '48%',
    minHeight: 52,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
  },
  hint: {
    marginTop: 32,
    fontSize: 12,
  },
});