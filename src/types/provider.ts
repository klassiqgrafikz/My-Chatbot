import { OpenAIModel } from './openai';

export interface AIProvider {
  id: string;
  name: string;
  apiHost: string;
  apiKey: string;
  isCustom: boolean;
  models: OpenAIModel[];
}

export const MODEL_DEFAULT_MAX_LENGTH = 32000;
export const MODEL_DEFAULT_TOKEN_LIMIT = 8000;

export const DEFAULT_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    apiHost: 'https://api.openai.com/v1',
    apiKey: '',
    isCustom: false,
    models: [],
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    apiHost: 'https://openrouter.ai/api/v1',
    apiKey: '',
    isCustom: false,
    models: [],
  },
  {
    id: 'tokenrouter',
    name: 'TokenRouter',
    apiHost: 'https://tokenrouter.me/v1',
    apiKey: '',
    isCustom: false,
    models: [],
  },
  {
    id: 'opencode',
    name: 'OpenCode',
    apiHost: 'https://api.opencode.ai/v1',
    apiKey: '',
    isCustom: false,
    models: [],
  },
];

export const getProviderApiHost = (provider: {
  id: string;
  apiHost: string;
}): string => {
  if (provider.id === 'openai') {
    return 'https://api.openai.com/v1';
  }

  return provider.apiHost || 'https://api.openai.com/v1';
};