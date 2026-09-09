import { useCallback, useEffect, useRef } from 'react';
import { VoiceSettings } from '@/types/voice';
import { fishTts } from '@/utils/app/fishAudio';

export function useVoiceOutput(voice?: VoiceSettings) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const settingsRef = useRef<VoiceSettings | undefined>(voice);
  settingsRef.current = voice;

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  const playText = useCallback(
    async (text: string) => {
      const s = settingsRef.current;
      if (!s || !s.enabled || !s.fishApiKey) return;
      if (!text.trim()) return;

      stop();
      try {
        const blob = await fishTts(s.fishApiKey, text, {
          referenceId: s.referenceId || undefined,
          speed: s.speed,
        });
        const url = URL.createObjectURL(blob);
        urlRef.current = url;

        if (!audioRef.current) {
          audioRef.current = new Audio();
          audioRef.current.onended = () => {
            if (urlRef.current) {
              URL.revokeObjectURL(urlRef.current);
              urlRef.current = null;
            }
          };
        }
        audioRef.current.src = url;
        audioRef.current.play().catch((error) => {
          console.error('TTS playback failed', error);
        });
      } catch (error) {
        console.error('TTS synthesis failed', error);
      }
    },
    [stop],
  );

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  return { playText, stop };
}