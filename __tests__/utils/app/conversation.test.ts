import { Conversation, Message } from '@/types/chat';
import {
  stripConversationAttachments,
  stripConversationsAttachments,
  stripMessageAttachments,
} from '@/utils/app/conversation';
import { describe, expect, it } from 'vitest';

const imageAttachment = {
  type: 'image' as const,
  fileName: 'photo.png',
  mimeType: 'image/png',
  dataUrl: 'data:image/png;base64,AAAA',
  extracted: true,
};

describe('stripMessageAttachments', () => {
  it('returns the message unchanged when there are no attachments', () => {
    const message: Message = { role: 'user', content: 'Hi' };
    expect(stripMessageAttachments(message)).toEqual(message);
  });

  it('removes attachments from a message', () => {
    const message: Message = {
      role: 'user',
      content: 'Look',
      attachments: [imageAttachment],
    };
    const result = stripMessageAttachments(message);
    expect(result).toEqual({ role: 'user', content: 'Look' });
    expect(result).not.toHaveProperty('attachments');
  });
});

describe('stripConversationAttachments', () => {
  it('strips attachments from every message and keeps the rest intact', () => {
    const conversation: Conversation = {
      id: 'c1',
      name: 'Test',
      model: { id: 'gpt-4o', name: 'GPT-4o', maxLength: 24000, tokenLimit: 8000 },
      prompt: 'You are helpful.',
      folderId: null,
      providerId: 'openai',
      messages: [
        { role: 'user', content: 'Look', attachments: [imageAttachment] },
        { role: 'assistant', content: 'Seen it.' },
        {
          role: 'user',
          content: 'Again',
          attachments: [
            { type: 'file', fileName: 'a.txt', mimeType: 'text/plain', rawText: 'x' },
          ],
        },
      ],
    };

    const result = stripConversationAttachments(conversation);

    expect(result.id).toBe('c1');
    expect(result.name).toBe('Test');
    expect(result.messages[0]).toEqual({ role: 'user', content: 'Look' });
    expect(result.messages[1]).toEqual({ role: 'assistant', content: 'Seen it.' });
    expect(result.messages[2]).toEqual({ role: 'user', content: 'Again' });
    expect(result.messages.every((m) => !m.attachments)).toBe(true);
  });

  it('does not mutate the original conversation', () => {
    const conversation: Conversation = {
      id: 'c1',
      name: 'Test',
      model: { id: 'gpt-4o', name: 'GPT-4o', maxLength: 24000, tokenLimit: 8000 },
      prompt: '',
      folderId: null,
      providerId: 'openai',
      messages: [
        { role: 'user', content: 'Look', attachments: [imageAttachment] },
      ],
    };

    stripConversationAttachments(conversation);

    expect(conversation.messages[0].attachments).toEqual([imageAttachment]);
  });
});

describe('stripConversationsAttachments', () => {
  it('strips attachments across an array of conversations', () => {
    const conversations: Conversation[] = [
      {
        id: 'c1',
        name: 'A',
        model: { id: 'gpt-4o', name: 'GPT-4o', maxLength: 24000, tokenLimit: 8000 },
        prompt: '',
        folderId: null,
        providerId: 'openai',
        messages: [{ role: 'user', content: 'Look', attachments: [imageAttachment] }],
      },
      {
        id: 'c2',
        name: 'B',
        model: { id: 'gpt-4o', name: 'GPT-4o', maxLength: 24000, tokenLimit: 8000 },
        prompt: '',
        folderId: null,
        providerId: 'openai',
        messages: [{ role: 'user', content: 'No attachments' }],
      },
    ];

    const results = stripConversationsAttachments(conversations);

    expect(results).toHaveLength(2);
    expect(results[0].messages[0]).toEqual({ role: 'user', content: 'Look' });
    expect(results[1].messages[0]).toEqual({
      role: 'user',
      content: 'No attachments',
    });
  });
});