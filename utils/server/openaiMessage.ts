import { Message } from '@/types/chat';

export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

export type OpenAIMessage =
  | { role: string; content: string }
  | { role: string; content: OpenAIContentPart[] };

export const toOpenAIMessage = (
  message: Message,
  supportsVision: boolean,
): OpenAIMessage => {
  const attachments = message.attachments;

  if (!attachments || attachments.length === 0) {
    return { role: message.role, content: message.content };
  }

  const parts: OpenAIContentPart[] = [];

  if (message.content.trim()) {
    parts.push({ type: 'text', text: message.content });
  }

  for (const attachment of attachments) {
    if (attachment.type === 'image') {
      if (supportsVision && attachment.dataUrl) {
        parts.push({
          type: 'image_url',
          image_url: { url: attachment.dataUrl },
        });
      }
    } else if (attachment.rawText) {
      parts.push({
        type: 'text',
        text: `[Attached file: ${attachment.fileName}]\n${attachment.rawText}`,
      });
    } else {
      parts.push({
        type: 'text',
        text: `[Attached file: ${attachment.fileName} — content not extracted]`,
      });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'text', text: message.content });
  }

  return { role: message.role, content: parts };
};