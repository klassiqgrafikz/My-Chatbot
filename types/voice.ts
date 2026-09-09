export interface VoiceSettings {
  enabled: boolean;
  fishApiKey: string;
  referenceId: string;
  voiceName: string;
  speed: number;
  language: string;
  autoPlay: boolean;
}

export interface FishAudioVoice {
  id: string;
  title: string;
  description?: string;
}

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: false,
  fishApiKey: '',
  referenceId: '',
  voiceName: '',
  speed: 1,
  language: 'en',
  autoPlay: true,
};

export const VOICE_MODEL = 's2.1-pro-free';
export const ASR_MODEL = 'transcribe-1';

export const FISH_API_BASE = 'https://api.fish.audio';