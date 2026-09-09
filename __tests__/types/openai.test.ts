import { OpenAIModels, OpenAIModelID, isVisionModel } from '@/types/openai';
import { describe, expect, it } from 'vitest';

describe('isVisionModel', () => {
  it('flags known vision model ids', () => {
    expect(isVisionModel('gpt-4o')).toBe(true);
    expect(isVisionModel('gpt-4o-mini')).toBe(true);
    expect(isVisionModel('gpt-4.5-preview')).toBe(true);
    expect(isVisionModel('gpt-4-vision-preview')).toBe(true);
    expect(isVisionModel('gemini-1.5-pro')).toBe(true);
    expect(isVisionModel('gemini-exp-1121')).toBe(true);
    expect(isVisionModel('claude-3-5-sonnet-20241022')).toBe(true);
    expect(isVisionModel('o1')).toBe(true);
    expect(isVisionModel('o3-mini')).toBe(true);
    expect(isVisionModel('qwen2.5-vl-7b-instruct')).toBe(true);
    expect(isVisionModel('meta-llama/llava-v1.5-13b-hf')).toBe(true);
  });

  it('does not flag non-vision model ids', () => {
    expect(isVisionModel('gpt-3.5-turbo')).toBe(false);
    expect(isVisionModel('gpt-4')).toBe(false);
    expect(isVisionModel('text-davinci-003')).toBe(false);
    expect(isVisionModel('llama-3.1-8b-instruct')).toBe(false);
    expect(isVisionModel('mistral-large')).toBe(false);
  });

  it('marks the gpt-4o default as vision capable', () => {
    expect(OpenAIModels[OpenAIModelID.GPT_4O].supportsVision).toBe(true);
  });

  it('keeps existing defaults non-vision', () => {
    expect(OpenAIModels[OpenAIModelID.GPT_3_5].supportsVision).toBeUndefined();
    expect(OpenAIModels[OpenAIModelID.GPT_4].supportsVision).toBeUndefined();
  });
});