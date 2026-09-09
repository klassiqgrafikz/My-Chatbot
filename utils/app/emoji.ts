import twemoji from 'twemoji';
import emojiRegex from 'emoji-regex';

export const EMOJI_CDN_BASE =
  'https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/';

export const emojiClassName =
  'inline-block h-[1.2em] w-[1.2em] align-[-0.2em]';

export const escapeHtml = (text: string) =>
  text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const toEmojiHtml = (text: string) =>
  twemoji.parse(escapeHtml(text), {
    base: EMOJI_CDN_BASE,
    folder: 'svg',
    ext: '.svg',
    className: emojiClassName,
  });

const emojiRegExpGlobal = (() => {
  return new RegExp(emojiRegex().source, 'g');
})();

const containsEmoji = (value: string): boolean => emojiRegex().test(value);

const extractEmojiSrc = (emoji: string): string => {
  const html = twemoji.parse(emoji, {
    base: EMOJI_CDN_BASE,
    folder: 'svg',
    ext: '.svg',
  });
  const match = /src="([^"]+)"/.exec(html);
  return match ? match[1] : '';
};

const isInsideCode = (node: any): boolean => {
  let current = node;
  while (current) {
    if (current.type === 'element' && current.tagName === 'pre') {
      return true;
    }
    if (
      current.type === 'element' &&
      (current.tagName === 'code' || current.tagName === 'pre')
    ) {
      return true;
    }
    current = current.parent;
  }
  return false;
};

export const rehypeEmoji = () => (tree: any) => {
  const visitText = (node: any) => {
    if (node.type !== 'text' || typeof node.value !== 'string') {
      if (node.children) {
        for (const child of node.children) {
          child.parent = node;
          visitText(child);
        }
      }
      return;
    }

    if (isInsideCode(node) || !containsEmoji(node.value)) {
      return;
    }

    const children: any[] = [];
    let lastIndex = 0;
    emojiRegExpGlobal.lastIndex = 0;

    let match = emojiRegExpGlobal.exec(node.value);
    while (match !== null) {
      const emoji = match[0];
      if (match.index > lastIndex) {
        children.push({
          type: 'text',
          value: node.value.slice(lastIndex, match.index),
        });
      }
      children.push({
        type: 'element',
        tagName: 'img',
        properties: {
          src: extractEmojiSrc(emoji),
          alt: emoji,
          draggable: false,
          className: emojiClassName,
        },
        children: [],
      });
      lastIndex = match.index + emoji.length;
      match = emojiRegExpGlobal.exec(node.value);
    }

    if (lastIndex < node.value.length) {
      children.push({ type: 'text', value: node.value.slice(lastIndex) });
    }

    if (children.length > 0) {
      const textOnly = children.every((child) => child.type === 'text');
      if (!textOnly) {
        node.type = 'element';
        node.tagName = 'span';
        node.properties = {};
        node.children = children;
      }
    }
  };

  visitText(tree);
};