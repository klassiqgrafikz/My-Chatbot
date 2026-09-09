import { Conversation } from '@/types/chat';

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
    localStorage.setItem('selectedConversation', JSON.stringify(conversation));
  } catch (error) {
    console.warn('Failed to save conversation to localStorage.', error);
  }
};

export const saveConversations = (conversations: Conversation[]) => {
  try {
    localStorage.setItem('conversationHistory', JSON.stringify(conversations));
  } catch (error) {
    console.warn('Failed to save conversation history to localStorage.', error);
  }
};
