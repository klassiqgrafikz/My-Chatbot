import React, { useRef, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File } from 'expo-file-system';
import { useApp } from '@/state/AppContext';
import { Attachment } from '@/types/chat';
import { useVoiceOutput } from '@/hooks/useVoiceOutput';

const TEXT_MIME =
  /^(text\/|application\/(json|xml|csv|javascript|typescript|rtf|sql|yaml|toml)|application\/x-)/;

export const Composer: React.FC = () => {
  const { theme, handleSend, loading: isGenerating, handleStop, voice: voiceSettings } = useApp();
  const voice = useVoiceOutput();
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showAttach, setShowAttach] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const resetAfterSend = () => {
    setInput('');
    setAttachments([]);
    inputRef.current?.clear();
  };

  const submit = (content?: string) => {
    const text = (content ?? input).trim();
    if (!text && attachments.length === 0) return;
    handleSend({
      role: 'user',
      content: text,
      attachments: attachments.length > 0 ? attachments : undefined,
    });
    resetAfterSend();
  };

  const pickImage = async () => {
    setShowAttach(false);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.8,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    if (!asset.base64) return;
    setAttachments((prev) => [
      ...prev,
      {
        type: 'image',
        fileName: asset.fileName || 'image.jpg',
        mimeType: asset.mimeType || 'image/jpeg',
        dataUrl: `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`,
      },
    ]);
  };

  const pickFile = async () => {
    setShowAttach(false);
    const res = await DocumentPicker.getDocumentAsync({
      type: ['text/*', 'application/pdf', 'application/json', 'application/x-*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled || !res.assets[0]) return;
    const asset = res.assets[0];
    const fileName = asset.name || 'file.txt';
    const mimeType = asset.mimeType || 'text/plain';
    const canRead = TEXT_MIME.test(mimeType) || (asset.size ?? 0) <= 200 * 1024;
    let rawText: string | undefined;
    if (canRead) {
      try {
        const f = new File(asset.uri);
        const info = f.size;
        if (info !== undefined && info <= 200 * 1024) {
          rawText = await f.text();
        } else {
          Alert.alert('File too large', 'Only text files under 200 KB are read.');
        }
      } catch {
        rawText = undefined;
      }
    }
    setAttachments((prev) => [
      ...prev,
      { type: 'file', fileName, mimeType, rawText },
    ]);
  };

  const removeAtt = (index: number) =>
    setAttachments((prev) => prev.filter((_, i) => i !== index));

  const onMic = async () => {
    if (voice.isRecording) {
      await voice.stopRecording((text) => {
        if (text) {
          submit(text);
        }
      });
    } else {
      await voice.startRecording();
    }
  };

  return (
    <View
      style={[
        styles.wrap,
        { borderTopColor: theme.border, backgroundColor: theme.background },
      ]}
    >
      {attachments.length > 0 && (
        <View style={styles.attWrap}>
          {attachments.map((att, i) => (
            <View
              key={i}
              style={[
                styles.attChip,
                {
                  backgroundColor: theme.surfaceAlt,
                  borderColor: theme.border,
                },
              ]}
            >
              <Ionicons
                name={att.type === 'image' ? 'image-outline' : 'document-text-outline'}
                size={13}
                color={theme.textSecondary}
              />
              <Text
                numberOfLines={1}
                style={[styles.attName, { color: theme.textSecondary }]}
              >
                {att.fileName}
              </Text>
              <Pressable onPress={() => removeAtt(i)} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color={theme.textMuted} />
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View
        style={[
          styles.composerBox,
          { borderColor: theme.border, backgroundColor: theme.surfaceInput },
        ]}
      >
        <Pressable
          onPress={() => setShowAttach(true)}
          style={styles.iconBtn}
          hitSlop={8}
        >
          <Ionicons name="add" size={24} color={theme.textSecondary} />
        </Pressable>

        <TextInput
          ref={inputRef}
          value={input}
          onChangeText={setInput}
          placeholder="Send a message"
          placeholderTextColor={theme.textMuted}
          multiline
          style={[
            styles.input,
            { color: theme.textPrimary, maxHeight: 160 },
          ]}
        />

        {voiceSettings.enabled && (
          <Pressable
            onPress={onMic}
            style={[
              styles.iconBtn,
              {
                backgroundColor: voice.isRecording
                  ? '#ff3b30'
                  : 'transparent',
              },
              voice.isTranscribing && { opacity: 0.5 },
            ]}
            hitSlop={8}
            disabled={voice.isTranscribing}
          >
            <Ionicons
              name={voice.isTranscribing ? 'hourglass-outline' : voice.isRecording ? 'stop' : 'mic'}
              size={22}
              color={
                voice.isRecording
                  ? '#fff'
                  : theme.textSecondary
              }
            />
          </Pressable>
        )}

        {input.trim().length > 0 ? (
          <Pressable
            onPress={() => submit()}
            style={[styles.iconBtn, { backgroundColor: theme.accent }]}
            hitSlop={8}
          >
            <Ionicons name="arrow-up" size={22} color="#fff" />
          </Pressable>
        ) : null}

        {isGenerating ? (
          <Pressable
            onPress={handleStop}
            style={styles.iconBtn}
            hitSlop={8}
          >
            <Ionicons name="stop-circle" size={24} color="#ff3b30" />
          </Pressable>
        ) : null}
      </View>

      <Modal
        visible={showAttach}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAttach(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowAttach(false)}
        >
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
          >
            <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>
              Attach
            </Text>
            <Pressable style={styles.modalRow} onPress={pickImage}>
              <Ionicons name="image-outline" size={20} color={theme.accent} />
              <Text style={{ color: theme.textPrimary, fontSize: 16 }}>
                Photo from library
              </Text>
            </Pressable>
            <Pressable style={styles.modalRow} onPress={pickFile}>
              <Ionicons name="document-text-outline" size={20} color={theme.accent} />
              <Text style={{ color: theme.textPrimary, fontSize: 16 }}>
                Text file
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  attWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  attChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
    maxWidth: 220,
  },
  attName: {
    fontSize: 12,
    flexShrink: 1,
  },
  composerBox: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  iconBtn: {
    width: 40,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingHorizontal: 8,
    paddingVertical: 6,
    includeFontPadding: false,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCard: {
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
});