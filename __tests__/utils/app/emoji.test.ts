import { describe, expect, it } from 'vitest';
import { rehypeEmoji, toEmojiHtml } from '@/utils/app/emoji';

describe('emoji', () => {
  it('HTML-escapes and turns emoji into twemoji image tags', () => {
    const html = toEmojiHtml('Hi <b> 😀 🇺🇸 👨‍👩‍👧');
    expect(html).toContain('&lt;b&gt;');
    expect(html).toContain('twemoji/14.0.2/svg/1f600.svg');
    expect(html).toContain('twemoji/14.0.2/svg/1f1fa-1f1f8.svg');
    expect(html).toContain('1f468-200d-1f469-200d-1f467.svg');
  });

  it('rehype plugin replaces emoji in text nodes, skips code blocks', () => {
    const tree: any = {
      type: 'root',
      children: [
        { type: 'text', value: 'Look 😀 👨‍👩‍👧 here' },
        {
          type: 'element',
          tagName: 'pre',
          properties: {},
          children: [
            {
              type: 'element',
              tagName: 'code',
              properties: {},
              children: [{ type: 'text', value: '😀' }],
            },
          ],
        },
      ],
    };
    tree.children.forEach((c: any) => (c.parent = tree));

    rehypeEmoji()(tree);

    const root = tree.children[0];
    expect(root.type).toBe('element');
    expect(root.tagName).toBe('span');
    const imgs = root.children.filter(
      (c: any) => c.type === 'element' && c.tagName === 'img',
    );
    expect(imgs).toHaveLength(2);
    expect(imgs[0].properties.src).toContain('1f600.svg');
    expect(imgs[0].properties.alt).toBe('😀');

    const pre = tree.children[1];
    expect(pre.children[0].children[0].type).toBe('text');
  });
});