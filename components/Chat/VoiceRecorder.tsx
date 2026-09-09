import {
  IconLoader2,
  IconMicrophone2,
  IconMicrophone2Off,
} from '@tabler/icons-react';
import toast from 'react-hot-toast';
import { useTranslation } from 'next-i18next';
import { FC, useCallback, useEffect, useRef, useState } from 'react';
import { blobToWav, fishAsr } from '@/utils/app/fishAudio';

interface Props {
  apiKey: string;
  language: string;
  disabled?: boolean;
  onTranscript: (text: string) => void;
  onRecordingChange?: (recording: boolean) => void;
}

const MAX_RECORDING_MS = 60000;

export const VoiceRecorder: FC<Props> = ({
  apiKey,
  language,
  disabled,
  onTranscript,
  onRecordingChange,
}) => {
  const { t } = useTranslation('chat');
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    stopTimer();
    setRecording(false);
    onRecordingChange?.(false);
  }, [onRecordingChange, stopTimer]);

  const startRecording = useCallback(async () => {
    if (!apiKey) {
      toast.error(t('Add your FishAudio API key in Settings → Voice.'));
      return;
    }
    if (disabled || processing) return;

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      toast.error(t('Voice recording is not supported in this browser.'));
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find(
        (m) => MediaRecorder.isTypeSupported(m),
      );
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      recorder.onstop = () => {
        void processAudio();
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setElapsed(0);
      setRecording(true);
      onRecordingChange?.(true);

      timerRef.current = setInterval(() => {
        setElapsed((prev) => {
          if (prev + 1 >= MAX_RECORDING_MS / 1000) {
            stopRecording();
            return prev + 1;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Mic access failed', error);
      toast.error(t('Microphone access was denied.'));
    }
  }, [apiKey, disabled, processing, onRecordingChange, stopRecording, t]);

  const processAudio = useCallback(async () => {
    const chunks = chunksRef.current;
    chunksRef.current = [];
    if (chunks.length === 0) return;

    setProcessing(true);
    try {
      const recorded = new Blob(chunks, {
        type:
          mediaRecorderRef.current?.mimeType ||
          'audio/webm;codecs=opus',
      });
      const wav = await blobToWav(recorded);
      const text = await fishAsr(apiKey, wav, language || undefined);
      if (text.trim()) {
        onTranscript(text.trim());
      } else {
        toast.error(t('No speech was detected.'));
      }
    } catch (error) {
      console.error('ASR failed', error);
      toast.error(t('Could not transcribe audio.'));
    } finally {
      setProcessing(false);
    }
  }, [apiKey, language, onTranscript, t]);

  useEffect(() => {
    return () => {
      stopRecording();
    };
  }, [stopRecording]);

  useEffect(() => {
    if (disabled && recording) {
      stopRecording();
    }
  }, [disabled, recording, stopRecording]);

  const mins = Math.floor(elapsed / 60);
  const secs = (elapsed % 60).toString().padStart(2, '0');
  const label = `${mins}:${secs}`;

  return (
    <div className="relative">
      <button
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 md:h-9 md:w-9 ${
          recording
            ? 'bg-red-500 text-white hover:bg-red-600'
            : 'text-neutral-500 hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10'
        }`}
        onClick={recording ? stopRecording : startRecording}
        disabled={disabled || processing}
        title={
          processing
            ? (t('Transcribing...') as string)
            : recording
              ? (t('Stop recording') as string)
              : (t('Voice message') as string)
        }
      >
        {processing ? (
          <IconLoader2 size={20} className="animate-spin" />
        ) : recording ? (
          <IconMicrophone2Off size={20} />
        ) : (
          <IconMicrophone2 size={20} />
        )}
      </button>

      {recording && (
        <div className="absolute bottom-full left-0 z-30 mb-2 flex items-center gap-2 rounded-full bg-[#202123] px-3 py-1.5 text-xs text-white shadow-xl">
          <span className="h-2 w-2 animate-pulse rounded-full bg-red-500"></span>
          {t('Recording')} {label}
        </div>
      )}
    </div>
  );
};