import React from 'react';
import { Image, Share, Text, View, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Message } from '@/types/chat';
import { useApp } from '@/state/AppContext';
import { Markdown } from './Markdown';

const BRAND_ICON = require('../../assets/icon.png');

export const MessageRow: React.FC<{
  message: Message;
  isStreaming?: boolean;
}> = ({ message, isStreaming }) => {
  const { theme, chatFontSize } = useApp();
  const isUser = message.role === 'user';

  const copyMessage = () => {
    Share.share({ message: message.content });
  };

  return (
    <View
      style={[
        styles.row,
        { backgroundColor: isUser ? theme.background : theme.surfaceAlt },
      ]}
    >
      <View style={styles.inner}>
        {!isUser && (
          <View style={[styles.avatarWrap, { backgroundColor: theme.surface }]}>
            <Image source={BRAND_ICON} style={styles.avatar} resizeMode="cover" />
          </View>
        )}

        <View style={styles.contentWrap}>
          {!isUser && (
            <Text style={[styles.name, { color: theme.textSecondary }]}>
              ChatGPT
            </Text>
          )}

          {message.attachments && message.attachments.length > 0 && (
            <View style={styles.attachments}>
              {message.attachments.map((att, i) =>
                att.type === 'image' && att.dataUrl ? (
                  <Image
                    key={i}
                    source={{ uri: att.dataUrl }}
                    style={styles.thumb}
                    resizeMode="cover"
                  />
                ) : (
                  <View
                    key={i}
                    style={[
                      styles.filePill,
                      {
                        backgroundColor: theme.surface,
                        borderColor: theme.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={14}
                      color={theme.textSecondary}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.fileName,
                        { color: theme.textSecondary },
                      ]}
                    >
                      {att.fileName}
                    </Text>
                  </View>
                ),
              )}
            </View>
          )}

          {isUser ? (
            <Text style={{ color: theme.textPrimary, fontSize: chatFontSize, lineHeight: chatFontSize * 1.55 }}>
              {message.content}
            </Text>
          ) : (
            <View style={styles.markdownWrap}>
              <Markdown content={message.content} fontSize={chatFontSize} />
              {isStreaming && (
                <Text style={{ color: theme.textPrimary, fontSize: chatFontSize }}>
                  ▍
                </Text>
              )}
            </View>
          )}

          <Pressable onPress={copyMessage} style={styles.copyBtn} hitSlop={8}>
            <Ionicons
              name="copy-outline"
              size={16}
              color={theme.textMuted}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inner: {
    flexDirection: 'row',
    maxWidth: 800,
    width: '100%',
    alignSelf: 'center',
    gap: 12,
  },
  avatarWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 32,
    height: 32,
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  contentWrap: {
    flex: 1,
    position: 'relative',
  },
  markdownWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 10,
    backgroundColor: '#00000022',
  },
  filePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: 200,
  },
  fileName: {
    fontSize: 12,
    flexShrink: 1,
  },
  copyBtn: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    padding: 6,
  },
});