import { File, Paths } from 'expo-file-system';
import {
  ASR_MODEL,
  FISH_API_BASE,
  FishAudioVoice,
  VOICE_MODEL,
} from '@/types/voice';

export async function fishTts(
  apiKey: string,
  text: string,
  options?: { referenceId?: string; speed?: number },
): Promise<string> {
  const response = await fetch(`${FISH_API_BASE}/v1/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      model: VOICE_MODEL,
    },
    body: JSON.stringify({
      text,
      ...(options?.referenceId ? { reference_id: options.referenceId } : {}),
      format: 'mp3',
      ...(options?.speed !== undefined ? { speed: options.speed } : {}),
    }),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`FishAudio TTS failed (${response.status}): ${errText}`);
  }

  const buffer = await response.arrayBuffer();
  const file = new File(Paths.cache, `tts-${Date.now()}.mp3`);
  file.write(new Uint8Array(buffer));
  return file.uri;
}

export async function fishAsr(
  apiKey: string,
  fileUri: string,
  language?: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', {
    uri: fileUri,
    name: 'audio.wav',
    type: 'audio/wav',
  } as any);
  form.append('model', ASR_MODEL);
  if (language) {
    form.append('language', language);
  }

  const response = await fetch(`${FISH_API_BASE}/v1/asr`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`FishAudio ASR failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (typeof data?.text === 'string' && data.text.trim()) {
    return data.text.trim();
  }
  throw new Error('FishAudio ASR returned no text.');
}

export async function listFishVoices(
  apiKey: string,
): Promise<FishAudioVoice[]> {
  const response = await fetch(`${FISH_API_BASE}/v1/voices`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`FishAudio list voices failed (${response.status})`);
  }

  const data = await response.json();
  const raw = Array.isArray(data) ? data : data?.items || data?.voices || [];
  return raw
    .filter((v: any) => v && (v._id || v.id))
    .map((v: any) => ({
      id: v._id || v.id,
      title: v.title || v.name || v._id || 'Voice ' + (v._id || v.id),
      description: v.description || undefined,
    }));
}