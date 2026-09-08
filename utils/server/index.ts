import { Message } from '@/types/chat';
import { OpenAIModel } from '@/types/openai';
import {
  getProviderApiHost,
  getProviderEnvKey,
} from '@/types/provider';
import { AIProvider } from '@/types/provider';
import { CONTINUE_SENTINEL } from '@/utils/app/const';
import {
  createParser,
  ParsedEvent,
  ReconnectInterval,
} from 'eventsource-parser';

export class OpenAIError extends Error {
  type: string;
  param: string;
  code: string;

  constructor(message: string, type: string, param: string, code: string) {
    super(message);
    this.name = 'OpenAIError';
    this.type = type;
    this.param = param;
    this.code = code;
  }
}

const isOpenAIHost = (apiHost: string) => {
  try {
    return new URL(apiHost).hostname.endsWith('api.openai.com');
  } catch {
    return false;
  }
};

export const OpenAIStream = async (
  model: OpenAIModel,
  systemPrompt: string,
  key: string,
  messages: Message[],
  provider: AIProvider,
  maxTokens = 1000,
) => {
  const apiHost = getProviderApiHost(provider);
  const apiKey = key || provider.apiKey || getProviderEnvKey(provider.id);

  if (!apiKey) {
    throw new OpenAIError(
      `No API key provided for ${provider.name}. Add your API key in the app or set the ${provider.id.toUpperCase()}_API_KEY server environment variable.`,
      'invalid_request_error',
      '',
      '',
    );
  }

  const extraHeaders: Record<string, string> = {};

  if (provider.id === 'openrouter') {
    extraHeaders['HTTP-Referer'] = 'https://chatbot-ui.vercel.app';
    extraHeaders['X-Title'] = 'Chatbot UI';
  }

  const res = await fetch(`${apiHost}/chat/completions`, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      ...(isOpenAIHost(apiHost) && process.env.OPENAI_ORGANIZATION
        ? { 'OpenAI-Organization': process.env.OPENAI_ORGANIZATION }
        : {}),
      ...extraHeaders,
    },
    method: 'POST',
    body: JSON.stringify({
      model: model.id,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages,
      ],
      max_tokens: maxTokens,
      temperature: 1,
      stream: true,
    }),
  });

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  if (res.status !== 200) {
    const result = await res.json();
    if (result.error) {
      throw new OpenAIError(
        result.error.message,
        result.error.type,
        result.error.param,
        result.error.code,
      );
    } else {
      throw new Error(
        `OpenAI API returned an error: ${
          decoder.decode(result?.value) || result.statusText
        }`,
      );
    }
  }

  const stream = new ReadableStream({
    async start(controller) {
      const onParse = (event: ParsedEvent | ReconnectInterval) => {
        if (event.type === 'event') {
          const data = event.data;

          if (data === '[DONE]') {
            controller.close();
            return;
          }

          try {
            const json = JSON.parse(data);
            const text = json.choices[0].delta.content;
            if (text) {
              const queue = encoder.encode(text);
              controller.enqueue(queue);
            }

            const finishReason =
              json.choices[0]?.finish_reason ||
              json.choices[0]?.delta?.finish_reason;

            if (finishReason === 'length') {
              controller.enqueue(encoder.encode(CONTINUE_SENTINEL));
            }
          } catch (e) {
            controller.error(e);
          }
        }
      };

      const parser = createParser(onParse);

      for await (const chunk of res.body as any) {
        parser.feed(decoder.decode(chunk));
      }
    },
  });

  return stream;
};
