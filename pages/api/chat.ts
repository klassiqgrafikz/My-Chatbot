import { ChatBody, Message } from '@/types/chat';
import { getProviderApiHost } from '@/types/provider';
import { DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import { OpenAIError, OpenAIStream } from '@/utils/server';
import tiktokenModel from '@dqbd/tiktoken/encoders/cl100k_base.json';
import { Tiktoken, init } from '@dqbd/tiktoken/lite/init';
// @ts-expect-error
import wasm from '../../node_modules/@dqbd/tiktoken/lite/tiktoken_bg.wasm?module';

export const config = {
  runtime: 'edge',
};

export const jsonError = (
  message: string,
  status: number,
): Response =>
  new Response(JSON.stringify({ message }), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

export const isAllowedProviderHost = (provider: {
  id: string;
  apiHost: string;
}): boolean => {
  const apiHost = getProviderApiHost(provider);

  try {
    const url = new URL(apiHost);
    const isLocal =
      url.hostname === 'localhost' || url.hostname === '127.0.0.1';

    return url.protocol === 'https:' || (url.protocol === 'http:' && isLocal);
  } catch {
    return false;
  }
};

const handler = async (req: Request): Promise<Response> => {
  try {
    const { model, messages, key, prompt, provider } =
      (await req.json()) as ChatBody;

    if (!provider?.id) {
      return jsonError('Missing provider configuration.', 400);
    }

    if (!isAllowedProviderHost(provider)) {
      return jsonError(
        'Provider base URL must use https (http is only allowed for localhost).',
        400,
      );
    }

    await init((imports) => WebAssembly.instantiate(wasm, imports));
    const encoding = new Tiktoken(
      tiktokenModel.bpe_ranks,
      tiktokenModel.special_tokens,
      tiktokenModel.pat_str,
    );

    let promptToSend = prompt;
    if (!promptToSend) {
      promptToSend = DEFAULT_SYSTEM_PROMPT;
    }

    const prompt_tokens = encoding.encode(promptToSend);

    let tokenCount = prompt_tokens.length;
    let messagesToSend: Message[] = [];

    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const tokens = encoding.encode(message.content);

      if (tokenCount + tokens.length + 1000 > model.tokenLimit) {
        break;
      }
      tokenCount += tokens.length;
      messagesToSend = [message, ...messagesToSend];
    }

    encoding.free();

    const stream = await OpenAIStream(
      model,
      promptToSend,
      key,
      messagesToSend,
      provider,
    );

    return new Response(stream);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof OpenAIError
        ? error.message
        : 'An unexpected error occurred. Please try again.';
    return jsonError(message, 500);
  }
};

export default handler;
