import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useApp } from '@/state/AppContext';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';
import { MessageRow } from '@/components/MessageRow';
import { Composer } from '@/components/Composer';
import { Welcome } from '@/components/Welcome';
import { Ionicons } from '@expo/vector-icons';

export const ChatScreen: React.FC = () => {
  const {
    theme,
    selectedConversation,
    messageIsStreaming,
    loading,
    continueEnabled,
    handleContinue,
    handleEditMessage,
  } = useApp();

  const voice = useVoiceOutput();
  const listRef = useRef<FlatList>(null);
  const [stickToBottom, setStickToBottom] = useState(true);

  const messages = selectedConversation?.messages ?? [];

  const scrollToBottom = useCallback((animated = false) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  useEffect(() => {
    scrollToBottom(true);
  }, [messages.length, messageIsStreaming, scrollToBottom]);

  useEffect(() => {
    if (messageIsStreaming) {
      voice.stopPlayback();
    }
  }, [messageIsStreaming, voice]);

  useEffect(() => {
    if (!messageIsStreaming && !loading) {
      const last = messages[messages.length - 1];
      if (last?.role === 'assistant' && last.content) {
        voice.playText(last.content);
      }
    }
  }, [messageIsStreaming, loading, messages, voice]);

  const onRegenerate = () => {
    if (messages.length === 0) return;
    const lastIndex = messages.length - 1;
    const lastMsg = messages[lastIndex];
    if (lastMsg.role === 'user') {
      void handleEditMessage(lastMsg, lastIndex);
    } else if (lastIndex > 0) {
      const prev = messages[lastIndex - 1];
      void handleEditMessage(prev, lastIndex - 1);
    }
  };

  const onScroll = (e: any) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    const dist = contentSize.height - (contentOffset.y + layoutMeasurement.height);
    setStickToBottom(dist < 80);
  };

  if (!selectedConversation) {
    return null;
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item, index }) => {
          const isLast = index === messages.length - 1;
          return (
            <MessageRow
              message={item}
              isStreaming={messageIsStreaming && isLast}
            />
          );
        }}
        ListEmptyComponent={messages.length === 0 ? <Welcome /> : null}
        onScroll={onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={
          messages.length === 0 ? styles.emptyContainer : styles.listContent
        }
        keyboardShouldPersistTaps="handled"
      />

      {messages.length > 0 && !stickToBottom && (
        <Pressable
          onPress={() => {
            setStickToBottom(true);
            scrollToBottom(true);
          }}
          style={[
            styles.jumpDown,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <Ionicons name="arrow-down" size={20} color={theme.textSecondary} />
        </Pressable>
      )}

      {continueEnabled && !messageIsStreaming && (
        <Pressable
          onPress={() => {
            void handleContinue();
            setStickToBottom(true);
          }}
          style={[styles.continuePill, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Ionicons
            name="refresh-outline"
            size={14}
            color={theme.textSecondary}
          />
          <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>
            Continue generating
          </Text>
        </Pressable>
      )}

      {messages.length > 0 && !messageIsStreaming && !loading && (
        <Pressable
          onPress={onRegenerate}
          style={[styles.regeneratePill, { backgroundColor: theme.surface, borderColor: theme.border }]}
        >
          <Text style={{ color: theme.textSecondary, fontSize: 13, fontWeight: '600' }}>
            Regenerate
          </Text>
        </Pressable>
      )}

      <Composer />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    paddingVertical: 8,
  },
  emptyContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  jumpDown: {
    position: 'absolute',
    right: 16,
    bottom: 90,
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  continuePill: {
    position: 'absolute',
    alignSelf: 'center',
    bottom: 88,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  regeneratePill: {
    position: 'absolute',
    alignSelf: 'flex-end',
    right: 16,
    bottom: 88,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
});