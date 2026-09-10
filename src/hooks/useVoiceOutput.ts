import { AudioQuality, useAudioPlayer, useAudioRecorder } from 'expo-audio';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { fishAsr, fishTts } from '@/lib/fishAudio';
import { useApp } from '@/state/AppContext';

const RECORDING_OPTIONS = {
  extension: '.m4a',
  sampleRate: 44100,
  numberOfChannels: 1,
  bitRate: 128000,
  android: {
    extension: '.m4a',
    outputFormat: 'mpeg4' as const,
    audioEncoder: 'aac' as const,
  },
  ios: {
    audioQuality: AudioQuality.HIGH,
  },
  web: {},
};

export function useVoiceOutput() {
  const { voice, handleSend } = useApp();
  const player = useAudioPlayer();
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const playText = useCallback(
    async (text: string) => {
      if (!voice?.enabled || !voice.fishApiKey || !text.trim()) return;
      try {
        const uri = await fishTts(voice.fishApiKey, text, {
          referenceId: voice.referenceId || undefined,
          speed: voice.speed,
        });
        if (player) {
          player.replace(uri);
          player.play();
        }
      } catch (error) {
        console.error('TTS failed', error);
      }
    },
    [voice, player],
  );

  const stopPlayback = useCallback(() => {
    if (player) {
      player.pause();
      player.seekTo(0);
    }
  }, [player]);

  const startRecording = useCallback(async () => {
    if (!voice?.fishApiKey) {
      Alert.alert(
        'FishAudio API key required',
        'Add your FishAudio API key in Settings → Voice.',
      );
      return;
    }
    const perm = await requestRecordingPermissions();
    if (!perm) return;
    recorder.record();
    setIsRecording(true);
  }, [voice, recorder]);

  const stopRecording = useCallback(
    async (onTranscript: (text: string) => void) => {
      if (!recorder.isRecording) return;
      await recorder.stop();
      setIsRecording(false);

      const uri = recorder.uri;
      if (!uri) return;

      setIsTranscribing(true);
      try {
        const text = await fishAsr(
          voice?.fishApiKey || '',
          uri,
          voice?.language || undefined,
        );
        if (text.trim()) {
          onTranscript(text.trim());
        } else {
          Alert.alert('No speech detected', 'Please try again.');
        }
      } catch (error) {
        console.error('ASR failed', error);
        Alert.alert('Transcription failed', 'Could not transcribe audio.');
      } finally {
        setIsTranscribing(false);
      }
    },
    [recorder, voice],
  );

  const requestRecordingPermissions = async (): Promise<boolean> => {
    const { requestRecordingPermissionsAsync } = await import('expo-audio');
    const res = await requestRecordingPermissionsAsync();
    if (!res.granted) {
      Alert.alert('Microphone access denied', 'Enable mic permission to use voice chat.');
      return false;
    }
    return true;
  };

  return {
    playText,
    stopPlayback,
    startRecording,
    stopRecording,
    isRecording,
    isTranscribing,
  };
}