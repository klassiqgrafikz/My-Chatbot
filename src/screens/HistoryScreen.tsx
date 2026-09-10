import React from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { DrawerNavigationProp } from '@react-navigation/drawer';
import { useApp } from '@/state/AppContext';
import { Conversation } from '@/types/chat';
import { RootDrawerParamList } from '@/navigation';

type Nav = DrawerNavigationProp<RootDrawerParamList, 'History'>;

export const HistoryScreen: React.FC = () => {
  const {
    theme,
    conversations,
    folders,
    handleSelectConversation,
    handleDeleteConversation,
    handleNewConversation,
  } = useApp();
  const navigation = useNavigation<Nav>();

  const chatFolders = folders.filter((f) => f.type === 'chat');
  const uncategorized = conversations.filter((c) => !c.folderId);
  const folderMap = new Map<string, Conversation[]>();
  chatFolders.forEach((f) => {
    const items = conversations.filter((c) => c.folderId === f.id);
    if (items.length > 0) folderMap.set(f.id, items);
  });

  const renderConversation = (c: Conversation) => (
    <Pressable
      key={c.id}
      onPress={() => {
        handleSelectConversation(c);
        navigation.navigate('Chat');
      }}
      onLongPress={() => {
        Alert.alert(
          'Delete chat',
          `Delete "${c.name}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => handleDeleteConversation(c),
            },
          ],
        );
      }}
      style={({ pressed }) => [
        styles.item,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name="chatbubble-outline" size={18} color={theme.textMuted} />
      <Text
        numberOfLines={1}
        style={[styles.itemText, { color: theme.textPrimary }]}
      >
        {c.name}
      </Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Chats
        </Text>
        <Pressable onPress={handleNewConversation} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={26} color={theme.accent} />
        </Pressable>
      </View>

      <FlatList
        data={[`__uncat`, ...chatFolders.map((f) => f.id)]}
        keyExtractor={(id) => id}
        renderItem={({ item }) => {
          if (item === '__uncat') {
            return (
              <View style={styles.sectionWrap}>
                {uncategorized.length > 0 && (
                  <>
                    <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                      Recent
                    </Text>
                    {uncategorized.map(renderConversation)}
                  </>
                )}
              </View>
            );
          }
          const folder = chatFolders.find((f) => f.id === item);
          const items = folderMap.get(item) || [];
          if (!folder || items.length === 0) return null;
          return (
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionTitle, { color: theme.textMuted }]}>
                {folder.name}
              </Text>
              {items.map(renderConversation)}
            </View>
          );
        }}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            No conversations yet.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionWrap: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  itemText: {
    flex: 1,
    fontSize: 15,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
  },
});