import { ChatBody, Message } from './chat';

export interface GoogleBody extends ChatBody {
  tavilyApiKey: string;
}

export interface GoogleResponse {
  message: Message;
}

export interface GoogleSource {
  title: string;
  link: string;
  content: string;
}