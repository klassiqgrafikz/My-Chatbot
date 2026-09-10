export interface OpenAIModel {
  id: string;
  name: string;
  maxLength: number;
  tokenLimit: number;
  isFree?: boolean;
  supportsVision?: boolean;
}

export enum OpenAIModelID {
  GPT_3_5 = 'gpt-3.5-turbo',
  GPT_4 = 'gpt-4',
  GPT_4O = 'gpt-4o',
}

export const fallbackModelID = OpenAIModelID.GPT_3_5;

export const OpenAIModels: Record<OpenAIModelID, OpenAIModel> = {
  [OpenAIModelID.GPT_3_5]: {
    id: OpenAIModelID.GPT_3_5,
    name: 'GPT-3.5',
    maxLength: 12000,
    tokenLimit: 4000,
  },
  [OpenAIModelID.GPT_4]: {
    id: OpenAIModelID.GPT_4,
    name: 'GPT-4',
    maxLength: 24000,
    tokenLimit: 8000,
  },
  [OpenAIModelID.GPT_4O]: {
    id: OpenAIModelID.GPT_4O,
    name: 'GPT-4o',
    maxLength: 24000,
    tokenLimit: 8000,
    supportsVision: true,
  },
};

export const isVisionModel = (modelId: string): boolean => {
  const id = modelId.toLowerCase();

  return (
    id.includes('vision') ||
    id.startsWith('gpt-4o') ||
    id.startsWith('gpt-4.5') ||
    id.startsWith('o1') ||
    id.startsWith('o3') ||
    id.startsWith('o4') ||
    id.startsWith('gemini') ||
    id.startsWith('claude') ||
    (id.includes('qwen') && id.includes('vl')) ||
    id.includes('llava') ||
    id.includes('phi-3-vision') ||
    id.includes('moondream') ||
    id.includes('idefics')
  );
};