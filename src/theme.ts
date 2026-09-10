export interface ThemeColors {
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceInput: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  danger: string;
  codeBackground: string;
  codeText: string;
}

export const dark: ThemeColors = {
  background: '#202123',
  surface: '#343541',
  surfaceAlt: '#444654',
  surfaceInput: '#40414F',
  border: '#444654',
  textPrimary: '#ffffff',
  textSecondary: '#ECECF1',
  textMuted: '#8E8EA0',
  accent: '#3b82f6',
  danger: '#ef4444',
  codeBackground: '#0f0f13',
  codeText: '#ECECF1',
};

export const light: ThemeColors = {
  background: '#ffffff',
  surface: '#ffffff',
  surfaceAlt: '#f7f7f8',
  surfaceInput: '#ffffff',
  border: '#e5e5e5',
  textPrimary: '#202123',
  textSecondary: '#4D4D4F',
  textMuted: '#8E8EA0',
  accent: '#3b82f6',
  danger: '#ef4444',
  codeBackground: '#0f0f13',
  codeText: '#ECECF1',
};

export type ThemeMode = 'dark' | 'light';

export const getTheme = (mode: ThemeMode): ThemeColors =>
  mode === 'dark' ? dark : light;