import { ASR_MODEL, FISH_API_BASE, FishAudioVoice, VOICE_MODEL } from '@/types/voice';

export async function fishTts(
  apiKey: string,
  text: string,
  options?: { referenceId?: string; speed?: number },
): Promise<Blob> {
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

  return await response.blob();
}

export async function fishAsr(
  apiKey: string,
  audioBlob: Blob,
  language?: string,
): Promise<string> {
  const form = new FormData();
  form.append('file', audioBlob, 'audio.wav');
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

export async function listFishVoices(apiKey: string): Promise<FishAudioVoice[]> {
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
      title: v.title || v.name || v._id || ('Voice ' + (v._id || v.id)),
      description: v.description || undefined,
    }));
}

async function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

export async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const audioCtx = new AudioCtx({ sampleRate: 16000 });
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);
  const channel = decoded.getChannelData(0);
  const sampleRate = decoded.sampleRate;

  const buffer = new ArrayBuffer(44 + channel.length * 2);
  const view = new DataView(buffer);

  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + channel.length * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, channel.length * 2, true);

  let offset = 44;
  for (let i = 0; i < channel.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, channel[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  await audioCtx.close();
  return new Blob([buffer], { type: 'audio/wav' });
}