import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/state/AppContext';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { Prompt } from '@/types/prompt';
import { GhostButton, PrimaryButton, ThemedInput } from '@/components/ui';

export const PromptsScreen: React.FC = () => {
  const { theme, prompts, addPrompt, updatePrompt, deletePrompt } = useApp();
  const [editing, setEditing] = useState<Prompt | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [content, setContent] = useState('');

  const openNew = () => {
    setName('');
    setContent('');
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (p: Prompt) => {
    setName(p.name);
    setContent(p.content);
    setEditing(p);
    setModalOpen(true);
  };

  const save = () => {
    const trimmedName = name.trim();
    const trimmedContent = content.trim();
    if (!trimmedName || !trimmedContent) {
      Alert.alert('Invalid prompt', 'Name and content are required.');
      return;
    }
    if (editing) {
      updatePrompt({ ...editing, name: trimmedName, content: trimmedContent });
    } else {
      addPrompt({
        name: trimmedName,
        description: '',
        content: trimmedContent,
        model: OpenAIModels[OpenAIModelID.GPT_3_5],
        folderId: null,
      });
    }
    setModalOpen(false);
  };

  const renderPrompt = (p: Prompt) => (
    <Pressable
      key={p.id}
      onPress={() => openEdit(p)}
      onLongPress={() => {
        Alert.alert(
          'Delete prompt',
          `Delete "${p.name}"?`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: () => deletePrompt(p.id),
            },
          ],
        );
      }}
      style={({ pressed }) => [
        styles.item,
        { opacity: pressed ? 0.6 : 1 },
      ]}
    >
      <Ionicons name="sparkles-outline" size={18} color={theme.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.textPrimary, fontSize: 15 }}>{p.name}</Text>
        <Text
          numberOfLines={1}
          style={{ color: theme.textMuted, fontSize: 13, marginTop: 2 }}
        >
          {p.content}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Prompt Templates
        </Text>
        <Pressable onPress={openNew} hitSlop={8}>
          <Ionicons name="add-circle-outline" size={26} color={theme.accent} />
        </Pressable>
      </View>

      <FlatList
        data={prompts}
        keyExtractor={(p) => p.id}
        renderItem={({ item }) => renderPrompt(item)}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: theme.textMuted }]}>
            No prompt templates yet.
          </Text>
        }
        contentContainerStyle={styles.listContent}
      />

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editing ? 'Edit prompt' : 'New prompt'}
            </Text>
            <ThemedInput
              placeholder="Name"
              value={name}
              onChangeText={setName}
              style={{ marginBottom: 10 }}
            />
            <ThemedInput
              placeholder="Prompt content"
              value={content}
              onChangeText={setContent}
              multiline
              style={{ minHeight: 120, textAlignVertical: 'top' }}
            />
            <View style={styles.modalRow}>
              <GhostButton
                title="Cancel"
                onPress={() => setModalOpen(false)}
                style={{ flex: 1 }}
              />
              <PrimaryButton
                title="Save"
                onPress={save}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
});