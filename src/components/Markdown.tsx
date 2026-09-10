import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MarkdownDisplay from 'react-native-markdown-display';
import { useApp } from '@/state/AppContext';

export const Markdown = React.memo(
  ({ content, fontSize }: { content: string; fontSize: number }) => {
    const { theme } = useApp();

    const styles = useMemo(() => {
      const base: Record<string, any> = {
        body: {
          color: theme.textPrimary,
          fontSize,
          lineHeight: fontSize * 1.55,
        },
        link: { color: theme.accent },
        heading1: { color: theme.textPrimary },
        heading2: { color: theme.textPrimary },
        heading3: { color: theme.textPrimary },
        heading4: { color: theme.textPrimary },
        heading5: { color: theme.textPrimary },
        heading6: { color: theme.textPrimary },
        strong: { color: theme.textPrimary },
        code_inline: {
          color: theme.textPrimary,
          backgroundColor: theme.codeBackground,
          fontSize: fontSize - 1,
        },
        code_block: {
          color: theme.codeText,
          backgroundColor: theme.codeBackground,
          fontSize,
        },
        fence: {
          color: theme.codeText,
          backgroundColor: theme.codeBackground,
        },
        pre: { backgroundColor: theme.codeBackground },
        table: {
          borderColor: theme.border,
          borderWidth: 1,
        },
        th: {
          backgroundColor: theme.surfaceAlt,
          color: theme.textPrimary,
          borderColor: theme.border,
          borderWidth: 1,
          padding: 6,
        },
        td: {
          color: theme.textPrimary,
          borderColor: theme.border,
          borderWidth: 1,
          padding: 6,
        },
        blockquote: {
          borderLeftColor: theme.border,
          borderLeftWidth: 3,
          paddingLeft: 10,
          opacity: 0.85,
        },
        hr: { backgroundColor: theme.border },
        bullet_list_icon: { color: theme.textPrimary },
        ordered_list_icon: { color: theme.textPrimary },
      };
      return StyleSheet.create(base);
    }, [theme, fontSize]);

    return (
      <MarkdownDisplay style={styles}>{content}</MarkdownDisplay>
    );
  },
);

export const ReadOnlyMessage: React.FC<{
  content: string;
  fontSize: number;
}> = ({ content, fontSize }) => {
  const { theme } = useApp();
  if (content.includes('http')) {
    return (
      <View>
        {content.split('\n').map((line, i) => (
          <Text
            key={i}
            style={{
              color: theme.textPrimary,
              fontSize,
              lineHeight: fontSize * 1.5,
            }}
          >
            {line}
          </Text>
        ))}
      </View>
    );
  }
  return <Markdown content={content} fontSize={fontSize} />;
};