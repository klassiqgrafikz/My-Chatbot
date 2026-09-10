import { Conversation, Message } from '@/types/chat';
import { localStorage } from './storage';

export const stripMessageAttachments = (message: Message): Message => {
  if (!message.attachments) {
    return message;
  }
  const { attachments, ...rest } = message;
  void attachments;
  return rest;
};

export const stripConversationAttachments = (
  conversation: Conversation,
): Conversation => {
  return {
    ...conversation,
    messages: conversation.messages.map(stripMessageAttachments),
  };
};

export const stripConversationsAttachments = (
  conversations: Conversation[],
): Conversation[] => {
  return conversations.map(stripConversationAttachments);
};

export const updateConversation = (
  updatedConversation: Conversation,
  allConversations: Conversation[],
) => {
  const updatedConversations = allConversations.map((c) => {
    if (c.id === updatedConversation.id) {
      return updatedConversation;
    }

    return c;
  });

  saveConversation(updatedConversation);
  saveConversations(updatedConversations);

  return {
    single: updatedConversation,
    all: updatedConversations,
  };
};

export const saveConversation = (conversation: Conversation) => {
  try {
    localStorage.setItem(
      'selectedConversation',
      JSON.stringify(stripConversationAttachments(conversation)),
    );
  } catch (error) {
    console.warn('Failed to save conversation.', error);
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  try {
    localStorage.setItem(
      'conversationHistory',
      JSON.stringify(stripConversationsAttachments(conversations)),
    );
  } catch (error) {
    console.warn('Failed to save conversation history.', error);
  }
};