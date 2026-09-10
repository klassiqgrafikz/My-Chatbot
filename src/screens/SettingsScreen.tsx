import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { Share } from 'react-native';
import { useApp } from '@/state/AppContext';
import { AIProvider } from '@/types/provider';
import { listFishVoices } from '@/lib/fishAudio';
import { exportDataJson } from '@/lib/importExport';
import {
  GhostButton,
  PrimaryButton,
  Row,
  Section,
  ThemedInput,
  Toggle,
} from '@/components/ui';

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5];
const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: 'Chinese' },
  { code: 'ja', label: 'Japanese' },
  { code: 'es', label: 'Spanish' },
  { code: 'fr', label: 'French' },
  { code: 'de', label: 'German' },
  { code: 'ko', label: 'Korean' },
  { code: 'pt', label: 'Portuguese' },
  { code: 'ru', label: 'Russian' },
  { code: 'ar', label: 'Arabic' },
];

export const SettingsScreen: React.FC = () => {
  const {
    theme,
    lightMode,
    setLightMode,
    chatFontSize,
    setChatFontSize,
    voice,
    setVoice,
    apiBaseUrl,
    setApiBaseUrl,
    providers,
    selectedProviderId,
    handleSelectProvider,
    handleUpdateProvider,
    handleAddProvider,
    handleRemoveProvider,
    activeProvider,
    fetchProviderModels,
    conversations,
    handleClearConversations,
    handleImportData,
    selectedConversation,
    handleUpdateConversation,
  } = useApp();

  const currentModelId = selectedConversation?.model.id;

  const [urlDraft, setUrlDraft] = useState(apiBaseUrl);
  const [modelModal, setModelModal] = useState(false);
  const [providerModal, setProviderModal] = useState(false);
  const [voiceModal, setVoiceModal] = useState(false);

  const [editName, setEditName] = useState('');
  const [editHost, setEditHost] = useState('');
  const [editKey, setEditKey] = useState('');
  const [editingProvider, setEditingProvider] = useState<AIProvider | null>(
    null,
  );

  const [voicesList, setVoicesList] = useState<{ id: string; title: string }[]>(
    [],
  );

  const [connecting, setConnecting] = useState(false);

  const saveUrl = () => {
    const trimmed = urlDraft.trim().replace(/\/+$/, '');
    if (!trimmed.startsWith('https://') && !trimmed.startsWith('http://')) {
      Alert.alert('Invalid URL', 'Enter a full URL like https://your-app.vercel.app');
      return;
    }
    setApiBaseUrl(trimmed);
    Alert.alert('Saved', 'API base URL updated.');
  };

  const exportData = () => {
    const json = exportDataJson();
    Share.share({
      title: 'Chatbot export',
      message: json,
    });
  };

  const importData = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets[0]) return;
    try {
      const f = new File(res.assets[0].uri);
      const text = await f.text();
      const data = JSON.parse(text);
      handleImportData(data);
    } catch {
      Alert.alert('Import failed', 'The selected file is not valid JSON.');
    }
  };

  const openProviderModal = (p: AIProvider | null) => {
    setEditingProvider(p);
    setEditName(p?.name ?? '');
    setEditHost(p?.apiHost ?? '');
    setEditKey(p?.apiKey ?? '');
    setProviderModal(true);
  };

  const saveProvider = async () => {
    if (connecting) return;
    if (!editName.trim()) {
      Alert.alert('Invalid provider', 'Name is required.');
      return;
    }
    const apiHost = editHost.trim().replace(/\/+$/, '');
    if (apiHost && !apiHost.startsWith('https://') && !apiHost.startsWith('http://')) {
      Alert.alert('Invalid host', 'API host must be an http(s) URL.');
      return;
    }
    setConnecting(true);
    try {
      const ok = editingProvider
        ? await handleUpdateProvider({
            ...editingProvider,
            name: editName.trim(),
            apiHost,
            apiKey: editKey.trim(),
          })
        : await handleAddProvider(editName.trim(), apiHost, editKey.trim());
      if (ok) {
        setProviderModal(false);
      }
    } finally {
      setConnecting(false);
    }
  };

  const reloadVoices = async () => {
    if (!voice.fishApiKey) return;
    try {
      const list = await listFishVoices(voice.fishApiKey);
      setVoicesList(list);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
          Settings
        </Text>

        <Section title="Backend">
          <ThemedInput
            value={urlDraft}
            onChangeText={setUrlDraft}
            placeholder="https://your-app.vercel.app"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={{ marginBottom: 10 }}
          />
          <PrimaryButton title="Save API URL" onPress={saveUrl} />
        </Section>

        <Section title="Providers & Model">
          {providers.map((p) => (
            <Row
              key={p.id}
              label={p.name}
              description={p.isCustom ? p.apiHost || 'Custom' : p.id}
              right={
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <Pressable
                    onPress={() => handleSelectProvider(p.id)}
                    hitSlop={8}
                  >
                    <Ionicons
                      name={
                        selectedProviderId === p.id
                          ? 'radio-button-on'
                          : 'radio-button-off'
                      }
                      size={20}
                      color={selectedProviderId === p.id ? theme.accent : theme.textMuted}
                    />
                  </Pressable>
                  <Pressable onPress={() => openProviderModal(p)} hitSlop={8}>
                    <Ionicons name="create-outline" size={19} color={theme.textMuted} />
                  </Pressable>
                  {p.isCustom && (
                    <Pressable
                      onPress={() =>
                        Alert.alert(
                          'Remove provider',
                          `Remove "${p.name}"?`,
                          [
                            { text: 'Cancel', style: 'cancel' },
                            {
                              text: 'Remove',
                              style: 'destructive',
                              onPress: () => handleRemoveProvider(p.id),
                            },
                          ],
                        )
                      }
                      hitSlop={8}
                    >
                      <Ionicons name="trash-outline" size={19} color={theme.danger} />
                    </Pressable>
                  )}
                </View>
              }
            />
          ))}
          <Row
label={
                activeProvider
                  ? `Model: ${currentModelId || activeProvider.models[0]?.id || 'not loaded'}`
                  : 'No provider selected'
              }
            onPress={() => setModelModal(true)}
            right={<Ionicons name="chevron-forward" size={16} color={theme.textMuted} />}
          />
          <Pressable onPress={() => openProviderModal(null)} hitSlop={8}>
            <Text style={{ color: theme.accent, marginTop: 4, fontSize: 14 }}>
              + Add custom provider
            </Text>
          </Pressable>
        </Section>

        <Section title="Appearance">
          <Row
            label="Dark mode"
            right={
              <Toggle
                value={lightMode === 'dark'}
                onValueChange={(v) => setLightMode(v ? 'dark' : 'light')}
              />
            }
          />
          <Row
            label={`Message size: ${chatFontSize}px`}
            right={
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Pressable onPress={() => setChatFontSize(chatFontSize - 1)} hitSlop={8}>
                  <Ionicons name="remove-circle-outline" size={22} color={theme.textSecondary} />
                </Pressable>
                <Pressable onPress={() => setChatFontSize(chatFontSize + 1)} hitSlop={8}>
                  <Ionicons name="add-circle-outline" size={22} color={theme.textSecondary} />
                </Pressable>
              </View>
            }
          />
        </Section>

        <Section title="Voice">
          <Row
            label="Enable voice chat"
            description="FishAudio speech-to-text and text-to-speech"
            right={
              <Toggle
                value={voice.enabled}
                onValueChange={(v) => setVoice({ ...voice, enabled: v })}
              />
            }
          />
          {voice.enabled && (
            <>
              <ThemedInput
                value={voice.fishApiKey}
                onChangeText={(t) => setVoice({ ...voice, fishApiKey: t })}
                placeholder="FishAudio API key"
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                style={{ marginVertical: 6 }}
              />
              <Row
                label={`Voice: ${voice.voiceName || 'Default'}${voice.referenceId ? ' (reference ID)' : ''}`}
                onPress={() => setVoiceModal(true)}
                right={<Ionicons name="chevron-forward" size={16} color={theme.textMuted} />}
              />
              <Row
                label="Speed"
                right={
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {SPEED_OPTIONS.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => setVoice({ ...voice, speed: s })}
                        style={[
                          styles.chip,
                          {
                            borderColor:
                              voice.speed === s ? theme.accent : theme.border,
                            backgroundColor:
                              voice.speed === s ? theme.accent + '22' : 'transparent',
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: voice.speed === s ? theme.accent : theme.textSecondary,
                            fontSize: 13,
                          }}
                        >
                          {s}x
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                }
              />
              <Row label="Language" onPress={() => {}} right={null} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {LANGUAGES.map((l) => (
                  <Pressable
                    key={l.code}
                    onPress={() => setVoice({ ...voice, language: l.code })}
                    style={[
                      styles.chip,
                      {
                        borderColor:
                          voice.language === l.code ? theme.accent : theme.border,
                        backgroundColor:
                          voice.language === l.code ? theme.accent + '22' : 'transparent',
                      },
                    ]}
                  >
                    <Text
                      style={{
                        color:
                          voice.language === l.code ? theme.accent : theme.textSecondary,
                        fontSize: 13,
                      }}
                    >
                      {l.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <Row
                label="Auto-play voice replies"
                right={
                  <Toggle
                    value={voice.autoPlay}
                    onValueChange={(v) => setVoice({ ...voice, autoPlay: v })}
                  />
                }
              />
            </>
          )}
        </Section>

        <Section title="Data">
          <Row
            label="Export conversations"
            onPress={exportData}
            right={<Ionicons name="share-outline" size={18} color={theme.textSecondary} />}
          />
          <Row
            label="Import conversations"
            onPress={importData}
            right={<Ionicons name="download-outline" size={18} color={theme.textSecondary} />}
          />
          <Row
            label={`Clear all conversations (${conversations.length})`}
            onPress={() =>
              Alert.alert(
                'Clear all chats',
                'This cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Clear', style: 'destructive', onPress: handleClearConversations },
                ],
              )
            }
            right={<Ionicons name="trash-outline" size={18} color={theme.danger} />}
          />
        </Section>
      </ScrollView>

      <Modal visible={modelModal} transparent animationType="slide" onRequestClose={() => setModelModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {activeProvider?.name || 'Provider'}{' '}
              {activeProvider && activeProvider.models.length === 0 ? '(models not loaded)' : ''}
            </Text>
            {activeProvider && activeProvider.models.length === 0 && (
              <GhostButton
                title="Fetch models"
                onPress={() => void fetchProviderModels(activeProvider)}
                style={{ marginBottom: 12 }}
              />
            )}
            {activeProvider?.models.map((m) => (
              <Pressable
                key={m.id}
                onPress={() => {
                  if (selectedConversation) {
                    handleUpdateConversation(selectedConversation, {
                      key: 'model',
                      value: m,
                    });
                    setModelModal(false);
                  }
                }}
                style={styles.modalRowPress}
              >
                <Text style={{ color: theme.textPrimary, fontSize: 15 }}>{m.id}</Text>
                <Ionicons
                  name={
                    currentModelId === m.id
                      ? 'radio-button-on'
                      : 'radio-button-off'
                  }
                  size={18}
                  color={currentModelId === m.id ? theme.accent : theme.textMuted}
                />
              </Pressable>
            ))}
            <View style={{ height: 12 }} />
            <PrimaryButton title="Close" onPress={() => setModelModal(false)} />
          </View>
        </View>
      </Modal>

      <Modal visible={providerModal} transparent animationType="slide" onRequestClose={() => setProviderModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalBackdrop}
          behavior="padding"
        >
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              {editingProvider ? 'Edit provider' : 'Add provider'}
            </Text>
            <ThemedInput
              placeholder="Name (e.g. OpenAI)"
              value={editName}
              onChangeText={setEditName}
              style={{ marginBottom: 10 }}
              autoCapitalize="words"
            />
            <ThemedInput
              placeholder="API host (base URL, optional)"
              value={editHost}
              onChangeText={setEditHost}
              style={{ marginBottom: 10 }}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
            <ThemedInput
              placeholder="API key"
              value={editKey}
              onChangeText={setEditKey}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={{ marginBottom: 16 }}
            />
            <PrimaryButton
              title={editingProvider ? 'Save and Connect' : 'Add and Connect'}
              onPress={() => void saveProvider()}
              loading={connecting}
              style={{ marginBottom: 10 }}
            />
            <GhostButton
              title="Cancel"
              onPress={() => setProviderModal(false)}
              disabled={connecting}
            />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={voiceModal} transparent animationType="slide" onRequestClose={() => setVoiceModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Voice</Text>
            <ThemedInput
              placeholder="Voice reference ID (fish.audio/voice)"
              value={voice.referenceId}
              onChangeText={(t) => setVoice({ ...voice, referenceId: t })}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ marginBottom: 10 }}
            />
            <GhostButton
              title="Load my voices"
              onPress={reloadVoices}
              style={{ marginBottom: 10 }}
            />
            {voicesList.map((v) => (
              <Pressable
                key={v.id}
                onPress={() => {
                  setVoice({
                    ...voice,
                    referenceId: v.id,
                    voiceName: v.title,
                  });
                  setVoiceModal(false);
                }}
                style={styles.modalRowPress}
              >
                <Text style={{ color: theme.textPrimary, fontSize: 15, flex: 1 }}>
                  {v.title}
                </Text>
                {voice.referenceId === v.id && (
                  <Ionicons name="checkmark" size={18} color={theme.accent} />
                )}
              </Pressable>
            ))}
            <View style={{ height: 12 }} />
            <PrimaryButton title="Close" onPress={() => setVoiceModal(false)} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingBottom: 40,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  chip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
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
    maxHeight: '75%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  modalRowPress: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 12,
  },
});