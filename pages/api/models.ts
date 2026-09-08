import { OpenAIModel, OpenAIModels } from '@/types/openai';
import {
  AIProvider,
  getProviderApiHost,
  getProviderEnvKey,
  MODEL_DEFAULT_MAX_LENGTH,
  MODEL_DEFAULT_TOKEN_LIMIT,
} from '@/types/provider';

export const config = {
  runtime: 'edge',
};

const isAllowedProviderHost = (provider: {
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
    const { provider } = (await req.json()) as { provider: AIProvider };

    if (!provider?.id) {
      return new Response(
        JSON.stringify({ error: { message: 'Missing provider configuration.' } }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    if (!isAllowedProviderHost(provider)) {
      return new Response(
        JSON.stringify({
          error: {
            message:
              'Provider base URL must use https (http is only allowed for localhost).',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const apiHost = getProviderApiHost(provider);
    const apiKey = provider.apiKey || getProviderEnvKey(provider.id);

    const response = await fetch(`${apiHost}/models`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey ? apiKey : ''}`,
      },
    });

    if (response.status === 401) {
      return new Response(
        JSON.stringify({
          error: {
            message: `Invalid API key for ${provider.name}. Please check your API key and try again.`,
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      );
    } else if (response.status !== 200) {
      console.error(
        `${provider.name} API returned an error ${
          response.status
        }: ${await response.text()}`,
      );
      throw new Error(`${provider.name} API returned an error`);
    }

    const json = await response.json();

    const isFreeModel = (model: any): boolean => {
      const prompt = model?.pricing?.prompt;
      const completion = model?.pricing?.completion;

      if (prompt === undefined || prompt === null) {
        return false;
      }

      return (
        parseFloat(prompt) === 0 &&
        (completion === undefined ||
          completion === null ||
          parseFloat(completion) === 0)
      );
    };

    const models: OpenAIModel[] = json.data
      .map((model: any) => {
        const knownModel = OpenAIModels[model.id as keyof typeof OpenAIModels];

        return {
          id: model.id,
          name: knownModel ? knownModel.name : model.id,
          maxLength: knownModel ? knownModel.maxLength : MODEL_DEFAULT_MAX_LENGTH,
          tokenLimit: knownModel
            ? knownModel.tokenLimit
            : MODEL_DEFAULT_TOKEN_LIMIT,
          isFree: knownModel ? !!knownModel.isFree : isFreeModel(model),
        };
      })
      .sort((a: OpenAIModel, b: OpenAIModel) =>
        a.name.localeCompare(b.name),
      );

    return new Response(JSON.stringify(models), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(
      JSON.stringify({ error: { message: 'Failed to load models.' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export default handler;