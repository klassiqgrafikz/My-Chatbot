export const DEFAULT_SYSTEM_PROMPT =
  "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.";

export const CONTINUE_SENTINEL = '@@CHATBOT_CONTINUE@@';

export const uid = (): string => {
  return (
    Date.now().toString(36) + Math.random().toString(36).slice(2, 10)
  );
};