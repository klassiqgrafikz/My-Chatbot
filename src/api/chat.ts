import { ChatBody } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import { AIProvider } from '@/types/provider';
import { CONTINUE_SENTINEL } from '@/lib/const';

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onSentinel?: () => void;
  onDone: () => void;
  onError: (message: string) => void;
}

export interface AbortToken {
  aborted: boolean;
}

export const streamChat = (
  apiBaseUrl: string,
  body: ChatBody,
  callbacks: StreamCallbacks,
  abort: AbortToken,
) => {
  const xhr = new XMLHttpRequest();
  xhr.open('POST', `${apiBaseUrl.replace(/\/$/, '')}/api/chat`, true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  xhr.responseType = 'text';

  let buffer = '';

  const handleData = (payload: string) => {
    if (payload === '[DONE]') {
      callbacks.onDone();
      return;
    }

    try {
      const json = JSON.parse(payload);
      const text = json.choices?.[0]?.delta?.content;
      if (text) {
        callbacks.onDelta(text);
      }

      const finishReason =
        json.choices?.[0]?.finish_reason ||
        json.choices?.[0]?.delta?.finish_reason;

      if (finishReason === 'length') {
        callbacks.onSentinel?.();
      }
    } catch {
      // ignore malformed chunk
    }
  };

  xhr.onprogress = () => {
    if (abort.aborted) {
      xhr.abort();
      return;
    }

    const chunk = xhr.responseText.slice(buffer.length);
    buffer = xhr.responseText;

    const lines = chunk.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('data:')) {
        const payload = trimmed.slice(5).trim();
        if (payload === CONTINUE_SENTINEL) {
          callbacks.onSentinel?.();
        } else if (payload) {
          handleData(payload);
        }
      }
    }
  };

  xhr.onload = () => {
    if (abort.aborted) return;

    const remaining = xhr.responseText.slice(buffer.length);
    buffer = xhr.responseText;
    if (remaining.trim()) {
      const lines = remaining.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data:')) {
          const payload = trimmed.slice(5).trim();
          if (payload === CONTINUE_SENTINEL) {
            callbacks.onSentinel?.();
          } else if (payload) {
            handleData(payload);
          }
        }
      }
    }
    callbacks.onDone();
  };

  xhr.onerror = () => {
    callbacks.onError('Network error. Check your connection and API base URL.');
  };

  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4 && xhr.status !== 200) {
      let message = `Request failed (${xhr.status}).`;
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        // ignore
      }
      callbacks.onError(message);
    }
  };

  xhr.send(JSON.stringify(body));

  return {
    abort: () => {
      abort.aborted = true;
      try {
        xhr.abort();
      } catch {
        // ignore
      }
    },
  };
};

export const fetchModels = async (
  apiBaseUrl: string,
  provider: AIProvider,
): Promise<OpenAIModel[]> => {
  const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/models`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ provider }),
  });

  if (res.status === 401) {
    throw new Error(
      `Invalid API key for ${provider.name}. Please check your API key and try again.`,
    );
  }

  const data = await res.json();
  if (!res.ok) {
    if (data?.error?.message) {
      throw new Error(data.error.message);
    }
    throw new Error(`${provider.name} failed to load models (${res.status}).`);
  }

  return data as OpenAIModel[];
};