import { toOpenAIMessage } from '@/utils/server/openaiMessage';
import { describe, expect, it } from 'vitest';

describe('toOpenAIMessage', () => {
  it('passes plain messages through as a string', () => {
    const result = toOpenAIMessage(
      { role: 'user', content: 'Hello there' },
      true,
    );
    expect(result).toEqual({ role: 'user', content: 'Hello there' });
  });

  it('passes messages without attachments through even without vision', () => {
    const result = toOpenAIMessage({ role: 'user', content: 'Hi' }, false);
    expect(result).toEqual({ role: 'user', content: 'Hi' });
  });

  it('builds parts for a message with an image attachment', () => {
    const result = toOpenAIMessage(
      {
        role: 'user',
        content: 'What is in this image?',
        attachments: [
          {
            type: 'image',
            fileName: 'photo.png',
            mimeType: 'image/png',
            dataUrl: 'data:image/png;base64,AAAA',
          },
        ],
      },
      true,
    );

    expect(result).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image?' },
        { type: 'image_url', image_url: { url: 'data:image/png;base64,AAAA' } },
      ],
    });
  });

  it('drops image parts when the model has no vision support', () => {
    const result = toOpenAIMessage(
      {
        role: 'user',
        content: 'What is in this image?',
        attachments: [
          {
            type: 'image',
            fileName: 'photo.png',
            mimeType: 'image/png',
            dataUrl: 'data:image/png;base64,AAAA',
          },
          {
            type: 'file',
            fileName: 'notes.txt',
            mimeType: 'text/plain',
            rawText: 'buy milk',
            extracted: true,
          },
        ],
      },
      false,
    );

    expect(result).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'What is in this image?' },
        {
          type: 'text',
          text: '[Attached file: notes.txt]\nbuy milk',
        },
      ],
    });
  });

  it('injects extracted and unextracted file contents as text parts', () => {
    const result = toOpenAIMessage(
      {
        role: 'user',
        content: 'summarize',
        attachments: [
          {
            type: 'file',
            fileName: 'doc.pdf',
            mimeType: 'application/pdf',
            rawText: 'page one',
            extracted: true,
          },
          {
            type: 'file',
            fileName: 'data.xlsx',
            mimeType: 'application/vnd.ms-excel',
            extracted: false,
          },
        ],
      },
      false,
    );

    expect(result).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: 'summarize' },
        { type: 'text', text: '[Attached file: doc.pdf]\npage one' },
        {
          type: 'text',
          text: '[Attached file: data.xlsx — content not extracted]',
        },
      ],
    });
  });

  it('keeps the text part when an image-only message has no caption', () => {
    const result = toOpenAIMessage(
      {
        role: 'user',
        content: '',
        attachments: [
          {
            type: 'image',
            fileName: 'photo.png',
            mimeType: 'image/png',
            dataUrl: 'data:image/png;base64,BBBB',
          },
        ],
      },
      true,
    );

    expect(result).toEqual({
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: 'data:image/png;base64,BBBB' } },
      ],
    });
  });
});