import { OpenAIModel } from './openai';
import { AIProvider } from './provider';

export interface Attachment {
  type: 'image' | 'file';
  fileName: string;
  mimeType: string;
  dataUrl?: string;
  rawText?: string;
  extracted?: boolean;
}

export interface Message {
  role: Role;
  content: string;
  attachments?: Attachment[];
}

export type Role = 'assistant' | 'user';

export interface ChatBody {
  model: OpenAIModel;
  messages: Message[];
  key: string;
  prompt: string;
  provider: AIProvider;
}

export interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  model: OpenAIModel;
  prompt: string;
  folderId: string | null;
  providerId: string;
}