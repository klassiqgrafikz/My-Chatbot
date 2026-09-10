import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { Conversation, Message } from '@/types/chat';
import { Folder } from '@/types/folder';
import { OpenAIModelID, OpenAIModels } from '@/types/openai';
import { Plugin, PluginKey } from '@/types/plugin';
import { AIProvider, DEFAULT_PROVIDERS } from '@/types/provider';
import { Prompt } from '@/types/prompt';
import { DEFAULT_VOICE_SETTINGS, VoiceSettings } from '@/types/voice';
import { streamChat } from '@/api/chat';
import { CONTINUE_SENTINEL, uid } from '@/lib/const';
import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/lib/clean';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/lib/conversation';
import { saveFolders } from '@/lib/folders';
import { cleanData, importData as persistImport } from '@/lib/importExport';
import { savePrompts } from '@/lib/prompts';
import { localStorage } from '@/lib/storage';
import { fetchModels as fetchModelsApi } from '@/api/chat';
import { getTheme, ThemeColors, ThemeMode } from '@/theme';

const API_BASE_DEFAULT = 'https://your-backend.example.com';

interface AppContextValue {
  conversations: Conversation[];
  selectedConversation: Conversation | undefined;
  folders: Folder[];
  prompts: Prompt[];
  pluginKeys: PluginKey[];
  providers: AIProvider[];
  selectedProviderId: string;
  lightMode: ThemeMode;
  theme: ThemeColors;
  chatFontSize: number;
  voice: VoiceSettings;
  apiBaseUrl: string;
  messageIsStreaming: boolean;
  loading: boolean;
  continueEnabled: boolean;
  activeProvider: AIProvider | undefined;

  handleSend: (
    message?: Message,
    deleteCount?: number,
    plugin?: Plugin | null,
    isContinue?: boolean,
  ) => Promise<void>;
  handleStop: () => void;
  handleContinue: () => void;
  handleNewConversation: () => void;
  handleSelectConversation: (conversation: Conversation) => void;
  handleDeleteConversation: (conversation: Conversation) => void;
  handleClearConversations: () => void;
  handleUpdateConversation: (
    conversation: Conversation,
    data: { key: string; value: any },
  ) => void;
  handleEditMessage: (message: Message, messageIndex: number) => void;

  addFolder: (name: string, type: 'chat' | 'prompt') => void;
  updateFolder: (folder: Folder) => void;
  deleteFolder: (folderId: string) => void;

  addPrompt: (prompt: Omit<Prompt, 'id'>) => void;
  updatePrompt: (prompt: Prompt) => void;
  deletePrompt: (promptId: string) => void;

  handleUpdateProvider: (provider: AIProvider) => Promise<boolean>;
  handleSelectProvider: (providerId: string) => void;
  handleAddProvider: (
    name: string,
    apiHost: string,
    apiKey: string,
  ) => Promise<boolean>;
  handleRemoveProvider: (providerId: string) => void;
  fetchProviderModels: (provider: AIProvider) => Promise<boolean>;

  setLightMode: (mode: ThemeMode) => void;
  setChatFontSize: (px: number) => void;
  setVoice: (voice: VoiceSettings) => void;
  setApiBaseUrl: (url: string) => void;

  handleImportData: (data: any) => void;
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useApp must be used within AppProvider');
  }
  return ctx;
};

const readJson = <T,>(key: string): T | undefined => {
  const raw = localStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation>();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [pluginKeys, setPluginKeys] = useState<PluginKey[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>(DEFAULT_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    'openai',
  );
  const [lightMode, setLightModeState] = useState<ThemeMode>('dark');
  const [chatFontSize, setChatFontSizeState] = useState<number>(16);
  const [voice, setVoiceState] =
    useState<VoiceSettings>(DEFAULT_VOICE_SETTINGS);
  const [apiBaseUrl, setApiBaseUrlState] = useState<string>(API_BASE_DEFAULT);
  const [messageIsStreaming, setMessageIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [continueEnabled, setContinueEnabled] = useState(false);

  const stopConversationRef = useRef(false);
  const activeStreamRef = useRef<{ abort: () => void } | null>(null);
  const conversationResetRef = useRef(0);

  const theme = getTheme(lightMode);

  const activeProvider =
    providers.find(
      (p) =>
        p.id ===
        (selectedConversation?.providerId || selectedProviderId),
    ) ||
    providers.find((p) => p.id === selectedProviderId) ||
    providers[0];

  useEffect(() => {
    const t = localStorage.getItem('theme');
    if (t === 'light' || t === 'dark') {
      setLightModeState(t);
    }

    const fs = localStorage.getItem('chatFontSize');
    if (fs) {
      const parsed = parseInt(fs, 10);
      if (!isNaN(parsed)) {
        setChatFontSizeState(Math.min(22, Math.max(14, parsed)));
      }
    }

    const vs = localStorage.getItem('voiceSettings');
    if (vs) {
      try {
        setVoiceState({ ...DEFAULT_VOICE_SETTINGS, ...JSON.parse(vs) });
      } catch {}
    }

    const base = localStorage.getItem('apiBaseUrl');
    if (base) {
      setApiBaseUrlState(base);
    }

    const storedProviders = readJson<AIProvider[]>('providers');
    if (storedProviders && storedProviders.length > 0) {
      setProviders(storedProviders);
    }

    const storedProviderId = localStorage.getItem('selectedProviderId');
    if (storedProviderId) {
      setSelectedProviderId(storedProviderId);
    }

    const foldersRaw = readJson<Folder[]>('folders');
    if (foldersRaw) {
      setFolders(foldersRaw);
    }

    const promptsRaw = readJson<Prompt[]>('prompts');
    if (promptsRaw) {
      setPrompts(promptsRaw);
    }

    const pluginKeysRaw = readJson<PluginKey[]>('pluginKeys');
    if (pluginKeysRaw) {
      setPluginKeys(pluginKeysRaw);
    }

    const history = readJson<any[]>('conversationHistory');
    const cleaned = history ? cleanConversationHistory(history) : [];
    setConversations(cleaned);

    const storedSelected = readJson<Conversation>('selectedConversation');
    if (storedSelected) {
      setSelectedConversation(cleanSelectedConversation(storedSelected));
    } else if (cleaned.length > 0) {
      setSelectedConversation(cleanSelectedConversation(cleaned[0]));
    } else {
      setSelectedConversation(
        cleanSelectedConversation({
          id: uid(),
          name: 'New Conversation',
          messages: [],
          model: OpenAIModels[OpenAIModelID.GPT_3_5],
          prompt: '',
          folderId: null,
          providerId: 'openai',
        }),
      );
    }
  }, []);

  const handleSend = useCallback(
    async (
      message?: Message,
      deleteCount = 0,
      plugin: Plugin | null = null,
      isContinue = false,
    ) => {
      if (!selectedConversation) {
        return;
      }

      if (!apiBaseUrl || apiBaseUrl === API_BASE_DEFAULT) {
        Alert.alert(
          'API Base URL not set',
          'Open Settings and set the URL of your deployed backend (the website project), e.g. https://your-app.vercel.app',
        );
        return;
      }

      const resetToken = conversationResetRef.current;
      const conversationIdAtSend = selectedConversation.id;

      let updatedConversation: Conversation;

      if (isContinue) {
        updatedConversation = selectedConversation;
      } else if (deleteCount) {
        const updatedMessages = [...selectedConversation.messages];
        for (let i = 0; i < deleteCount; i++) {
          updatedMessages.pop();
        }
        updatedConversation = {
          ...selectedConversation,
          messages: [...updatedMessages, message!],
        };
      } else {
        updatedConversation = {
          ...selectedConversation,
          messages: [...selectedConversation.messages, message!],
        };
      }

      stopConversationRef.current = false;
      setContinueEnabled(false);

      if (!isContinue && message) {
        setSelectedConversation(updatedConversation);
      }

      setLoading(true);
      setMessageIsStreaming(true);

      if (!activeProvider) {
        return;
      }

      const abortRef: { aborted: boolean } = { aborted: false };

      const finish = () => {
        activeStreamRef.current = null;
        setLoading(false);
        setMessageIsStreaming(false);
      };

      try {
        await new Promise<void>((resolve) => {
          streamChat(
            apiBaseUrl,
            {
              model: updatedConversation.model,
              messages: updatedConversation.messages,
              key: activeProvider.apiKey || '',
              prompt: updatedConversation.prompt,
              provider: activeProvider,
            },
            {
              onDelta: (delta) => {
                if (conversationResetRef.current !== resetToken) return;

                const lastIndex = updatedConversation.messages.length - 1;
                const existing = updatedConversation.messages[lastIndex];

                setSelectedConversation((prev) => {
                  if (!prev) return prev;
                  const messages =
                    existing?.role === 'assistant'
                      ? prev.messages.map((m, i) =>
                          i === prev.messages.length - 1
                            ? { ...m, content: (m.content || '') + delta }
                            : m,
                        )
                      : [
                          ...prev.messages,
                          { role: 'assistant', content: delta } as Message,
                        ];
                  return { ...prev, messages };
                });

                updatedConversation = {
                  ...updatedConversation,
                  messages:
                    existing?.role === 'assistant'
                      ? updatedConversation.messages.map((m, i) =>
                          i === updatedConversation.messages.length - 1
                            ? { ...m, content: (m.content || '') + delta }
                            : m,
                        )
                      : [
                          ...updatedConversation.messages,
                          { role: 'assistant', content: delta },
                        ],
                };
              },
              onSentinel: () => {
                setContinueEnabled(true);
              },
              onDone: () => {
                resolve();
              },
              onError: (msg) => {
                Alert.alert('Error', msg);
                resolve();
              },
            },
            abortRef,
          );

          activeStreamRef.current = {
            abort: () => {
              abortRef.aborted = true;
            },
          };
        });

        if (conversationResetRef.current !== resetToken) {
          return;
        }

        if (!isContinue && updatedConversation.messages.length === 1 && message) {
          const { content } = message;
          const customName =
            content.length > 30 ? content.substring(0, 30) + '...' : content;
          updatedConversation = { ...updatedConversation, name: customName };
        }

        setSelectedConversation(updatedConversation);
        saveConversation(updatedConversation);

        const updatedConversations: Conversation[] = conversations.map((c) =>
          c.id === conversationIdAtSend ? updatedConversation : c,
        );
        if (updatedConversations.length === 0) {
          updatedConversations.push(updatedConversation);
        }
        setConversations(updatedConversations);
        saveConversations(updatedConversations);
      } catch (error) {
        console.error(error);
        Alert.alert('Error', 'An error occurred while streaming the response.');
      } finally {
        finish();
      }
    },
    [
      selectedConversation,
      conversations,
      activeProvider,
      apiBaseUrl,
    ],
  );

  const handleStop = useCallback(() => {
    stopConversationRef.current = true;
    activeStreamRef.current?.abort();
    activeStreamRef.current = null;
  }, []);

  const handleContinue = useCallback(() => {
    handleSend(undefined, 0, null, true);
  }, [handleSend]);

  const handleNewConversation = useCallback(() => {
    conversationResetRef.current += 1;
    activeStreamRef.current?.abort();
    setMessageIsStreaming(false);
    setLoading(false);
    setContinueEnabled(false);

    const model =
      activeProvider?.models[0] || OpenAIModels[OpenAIModelID.GPT_3_5];
    const newConversation: Conversation = {
      id: uid(),
      name: 'New Conversation',
      messages: [],
      model,
      prompt: activeProvider?.models.length > 0 ? '' : '',
      folderId: null,
      providerId: activeProvider?.id || selectedProviderId,
    };

    setSelectedConversation(newConversation);
    saveConversation(newConversation);
  }, [activeProvider, selectedProviderId]);

  const handleSelectConversation = useCallback(
    (conversation: Conversation) => {
      conversationResetRef.current += 1;
      activeStreamRef.current?.abort();
      setMessageIsStreaming(false);
      setLoading(false);
      setContinueEnabled(false);
      setSelectedConversation(conversation);
      saveConversation(conversation);
    },
    [],
  );

  const handleDeleteConversation = useCallback(
    (conversation: Conversation) => {
      const updated = conversations.filter((c) => c.id !== conversation.id);
      setConversations(updated);
      saveConversations(updated);

      if (selectedConversation?.id === conversation.id) {
        if (updated.length > 0) {
          setSelectedConversation(updated[0]);
          saveConversation(updated[0]);
        } else {
          handleNewConversation();
        }
      }
    },
    [conversations, selectedConversation, handleNewConversation],
  );

  const handleClearConversations = useCallback(() => {
    setConversations([]);
    saveConversations([]);
    handleNewConversation();
  }, [handleNewConversation]);

  const handleUpdateConversation = useCallback(
    (conversation: Conversation, data: { key: string; value: any }) => {
      const updatedConversation = {
        ...conversation,
        [data.key]: data.value,
      } as Conversation;
      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );
      setSelectedConversation(single);
      setConversations(all);
    },
    [conversations],
  );

  const handleEditMessage = useCallback(
    (message: Message, messageIndex: number) => {
      if (!selectedConversation) return;
      const updatedMessages = selectedConversation.messages.map((m, i) =>
        i === messageIndex ? message : m,
      );
      const updatedConversation = {
        ...selectedConversation,
        messages: updatedMessages,
      };
      setSelectedConversation(updatedConversation);
      saveConversation(updatedConversation);
      void handleSend(message, messageIndex + 1, null, false);
    },
    [selectedConversation, handleSend],
  );

  const addFolder = useCallback(
    (name: string, type: 'chat' | 'prompt') => {
      const next = [...folders, { id: uid(), name, type } as Folder];
      setFolders(next);
      saveFolders(next);
    },
    [folders],
  );

  const updateFolder = useCallback(
    (folder: Folder) => {
      const next = folders.map((f) => (f.id === folder.id ? folder : f));
      setFolders(next);
      saveFolders(next);
    },
    [folders],
  );

  const deleteFolder = useCallback(
    (folderId: string) => {
      const next = folders.filter((f) => f.id !== folderId);
      setFolders(next);
      saveFolders(next);

      if (selectedConversation?.folderId === folderId) {
        handleUpdateConversation(selectedConversation, {
          key: 'folderId',
          value: null,
        });
      }

      const nextPrompts = prompts.map((p) =>
        p.folderId === folderId ? { ...p, folderId: null } : p,
      );
      setPrompts(nextPrompts);
      savePrompts(nextPrompts);
    },
    [folders, prompts, selectedConversation, handleUpdateConversation],
  );

  const addPrompt = useCallback(
    (prompt: Omit<Prompt, 'id'>) => {
      const next = [...prompts, { ...prompt, id: uid() }];
      setPrompts(next);
      savePrompts(next);
    },
    [prompts],
  );

  const updatePrompt = useCallback(
    (prompt: Prompt) => {
      const next = prompts.map((p) => (p.id === prompt.id ? prompt : p));
      setPrompts(next);
      savePrompts(next);
    },
    [prompts],
  );

  const deletePrompt = useCallback(
    (promptId: string) => {
      const next = prompts.filter((p) => p.id !== promptId);
      setPrompts(next);
      savePrompts(next);
    },
    [prompts],
  );

  const fetchProviderModels = useCallback(
    async (provider: AIProvider): Promise<boolean> => {
      try {
        const models = await fetchModelsApi(apiBaseUrl, provider);
        if (!models.length) return false;
        const next = providers.map((p) =>
          p.id === provider.id ? { ...p, models } : p,
        );
        setProviders(next);
        localStorage.setItem('providers', JSON.stringify(next));
        return true;
      } catch (error) {
        Alert.alert('Error', (error as Error).message);
        return false;
      }
    },
    [providers, apiBaseUrl],
  );

  const handleUpdateProvider = useCallback(
    async (provider: AIProvider): Promise<boolean> => {
      const prev = providers.find((p) => p.id === provider.id);
      const keyChanged = prev ? prev.apiKey !== provider.apiKey : true;
      const hostChanged = prev ? prev.apiHost !== provider.apiHost : true;

      let updated = provider;
      if ((keyChanged || hostChanged) && provider.models.length > 0) {
        updated = { ...provider, models: [] };
      }

      const next = providers.map((p) => (p.id === provider.id ? updated : p));
      setProviders(next);
      localStorage.setItem('providers', JSON.stringify(next));

      if (updated.apiKey && updated.models.length === 0) {
        return fetchProviderModels(updated);
      }
      return true;
    },
    [providers, fetchProviderModels],
  );

  const handleSelectProvider = useCallback(
    (providerId: string) => {
      if (!providers.some((p) => p.id === providerId)) return;
      setSelectedProviderId(providerId);
      localStorage.setItem('selectedProviderId', providerId);
      if (selectedConversation) {
        handleUpdateConversation(selectedConversation, {
          key: 'providerId',
          value: providerId,
        });
      }
    },
    [providers, selectedConversation, handleUpdateConversation],
  );

  const handleAddProvider = useCallback(
    async (name: string, apiHost: string, apiKey: string): Promise<boolean> => {
      const provider: AIProvider = {
        id: uid(),
        name,
        apiHost,
        apiKey,
        isCustom: true,
        models: [],
      };
      const next = [...providers, provider];
      setProviders(next);
      localStorage.setItem('providers', JSON.stringify(next));
      if (apiKey) {
        return fetchProviderModels(provider);
      }
      return true;
    },
    [providers, fetchProviderModels],
  );

  const handleRemoveProvider = useCallback(
    (providerId: string) => {
      const next = providers.filter((p) => p.id !== providerId);
      setProviders(next);
      localStorage.setItem('providers', JSON.stringify(next));
      if (selectedProviderId === providerId) {
        const fallback = next[0]?.id || 'openai';
        setSelectedProviderId(fallback);
        localStorage.setItem('selectedProviderId', fallback);
      }
    },
    [providers, selectedProviderId],
  );

  const setLightMode = useCallback((mode: ThemeMode) => {
    setLightModeState(mode);
    localStorage.setItem('theme', mode);
  }, []);

  const setChatFontSize = useCallback((px: number) => {
    const next = Math.min(22, Math.max(14, Math.round(px)));
    setChatFontSizeState(next);
    localStorage.setItem('chatFontSize', String(next));
  }, []);

  const setVoice = useCallback((v: VoiceSettings) => {
    setVoiceState(v);
    localStorage.setItem('voiceSettings', JSON.stringify(v));
  }, []);

  const setApiBaseUrl = useCallback((url: string) => {
    setApiBaseUrlState(url);
    localStorage.setItem('apiBaseUrl', url);
  }, []);

  const handleImportData = useCallback(
    (data: any) => {
      try {
        const cleaned = cleanData(data);
        persistImport(cleaned);
        const history = cleaned.history;
        setConversations(history);
        if (history.length > 0) {
          setSelectedConversation(history[history.length - 1]);
          saveConversation(history[history.length - 1]);
        }
        setFolders(cleaned.folders);
        saveFolders(cleaned.folders);
        setPrompts(cleaned.prompts);
        savePrompts(cleaned.prompts);
        Alert.alert('Imported', 'Your data was imported successfully.');
      } catch (error) {
        Alert.alert('Import failed', 'The selected file is not valid.');
      }
    },
    [],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      conversations,
      selectedConversation,
      folders,
      prompts,
      pluginKeys,
      providers,
      selectedProviderId,
      lightMode,
      theme,
      chatFontSize,
      voice,
      apiBaseUrl,
      messageIsStreaming,
      loading,
      continueEnabled,
      activeProvider,
      handleSend,
      handleStop,
      handleContinue,
      handleNewConversation,
      handleSelectConversation,
      handleDeleteConversation,
      handleClearConversations,
      handleUpdateConversation,
      handleEditMessage,
      addFolder,
      updateFolder,
      deleteFolder,
      addPrompt,
      updatePrompt,
      deletePrompt,
      handleUpdateProvider,
      handleSelectProvider,
      handleAddProvider,
      handleRemoveProvider,
      fetchProviderModels,
      setLightMode,
      setChatFontSize,
      setVoice,
      setApiBaseUrl,
      handleImportData,
    }),
    [
      conversations,
      selectedConversation,
      folders,
      prompts,
      pluginKeys,
      providers,
      selectedProviderId,
      lightMode,
      theme,
      chatFontSize,
      voice,
      apiBaseUrl,
      messageIsStreaming,
      loading,
      continueEnabled,
      activeProvider,
      handleSend,
      handleStop,
      handleContinue,
      handleNewConversation,
      handleSelectConversation,
      handleDeleteConversation,
      handleClearConversations,
      handleUpdateConversation,
      handleEditMessage,
      addFolder,
      updateFolder,
      deleteFolder,
      addPrompt,
      updatePrompt,
      deletePrompt,
      handleUpdateProvider,
      handleSelectProvider,
      handleAddProvider,
      handleRemoveProvider,
      fetchProviderModels,
      setLightMode,
      setChatFontSize,
      setVoice,
      setApiBaseUrl,
      handleImportData,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};