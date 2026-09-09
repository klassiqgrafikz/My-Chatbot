import { Chat } from '@/components/Chat/Chat';
import { Chatbar } from '@/components/Chatbar/Chatbar';
import { Navbar } from '@/components/Mobile/Navbar';
import { Promptbar } from '@/components/Promptbar/Promptbar';
import { SettingsDrawer } from '@/components/Settings/SettingsDrawer';
import { ChatBody, Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import { LatestExportFormat, SupportedExportFormats } from '@/types/export';
import { Folder, FolderType } from '@/types/folder';
import {
  OpenAIModel,
  OpenAIModelID,
  OpenAIModels,
  fallbackModelID,
} from '@/types/openai';
import { Plugin, PluginKey } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { AIProvider, DEFAULT_PROVIDERS } from '@/types/provider';
import { getEndpoint } from '@/utils/app/api';
import {
  cleanConversationHistory,
  cleanSelectedConversation,
} from '@/utils/app/clean';
import { CONTINUE_SENTINEL, DEFAULT_SYSTEM_PROMPT } from '@/utils/app/const';
import {
  saveConversation,
  saveConversations,
  updateConversation,
} from '@/utils/app/conversation';
import { saveFolders } from '@/utils/app/folders';
import { exportData, importData } from '@/utils/app/importExport';
import { savePrompts } from '@/utils/app/prompts';
import { IconArrowBarLeft, IconArrowBarRight } from '@tabler/icons-react';
import { GetServerSideProps } from 'next';
import { useTranslation } from 'next-i18next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Head from 'next/head';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { v4 as uuidv4 } from 'uuid';

interface HomeProps {
  serverSideApiKeyIsSet: boolean;
  serverSidePluginKeysSet: boolean;
  defaultModelId: OpenAIModelID;
}

const Home: React.FC<HomeProps> = ({
  serverSideApiKeyIsSet,
  serverSidePluginKeysSet,
  defaultModelId,
}) => {
  const { t } = useTranslation('chat');

  // STATE ----------------------------------------------

  const [providers, setProviders] = useState<AIProvider[]>(DEFAULT_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(
    DEFAULT_PROVIDERS[0].id,
  );
  const [providerFetch, setProviderFetch] = useState<{
    providerId: string | null;
    loading: boolean;
    error: string | null;
  }>({ providerId: null, loading: false, error: null });
  const [pluginKeys, setPluginKeys] = useState<PluginKey[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lightMode, setLightMode] = useState<'dark' | 'light'>('dark');
  const [messageIsStreaming, setMessageIsStreaming] = useState<boolean>(false);
  const [continueEnabled, setContinueEnabled] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [chatFontSize, setChatFontSize] = useState<number>(16);

  const [folders, setFolders] = useState<Folder[]>([]);

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation>();
  const [currentMessage, setCurrentMessage] = useState<Message>();

  const [showSidebar, setShowSidebar] = useState<boolean>(true);

  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [showPromptbar, setShowPromptbar] = useState<boolean>(true);

  // REFS ----------------------------------------------

  const stopConversationRef = useRef<boolean>(false);
  const fetchedProvidersRef = useRef<Set<string>>(new Set());
  const activeControllerRef = useRef<AbortController | null>(null);
  const conversationResetRef = useRef<number>(0);

  // FETCH RESPONSE ----------------------------------------------

  const handleSend = async (
    message?: Message,
    deleteCount = 0,
    plugin: Plugin | null = null,
    isContinue = false,
  ) => {
    if (!selectedConversation) {
      return;
    }

    const resetToken = conversationResetRef.current;
    const conversationIdAtSend = selectedConversation.id;

    const activeProvider =
      providers.find(
        (p) =>
          p.id ===
          (selectedConversation.providerId || selectedProviderId),
      ) ||
      providers.find((p) => p.id === selectedProviderId) ||
      providers[0];

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

    if (!isContinue) {
      setSelectedConversation(updatedConversation);
    }

    setLoading(true);
    setMessageIsStreaming(true);

    if (!activeProvider || !activeProvider.apiKey) {
      if (!(activeProvider?.id === 'openai' && serverSideApiKeyIsSet)) {
        setLoading(false);
        setMessageIsStreaming(false);
        toast.error(
          t(
            'No API key for the selected provider. Set your API key in the bottom left of the sidebar.',
          ),
        );
        return;
      }
    }

    const chatBody: ChatBody = {
      model: updatedConversation.model,
      messages: updatedConversation.messages,
      key: activeProvider?.apiKey || '',
      prompt: updatedConversation.prompt,
      provider: activeProvider as ChatBody['provider'],
    };

    const endpoint = getEndpoint(plugin);
    let body;

    if (!plugin) {
      body = JSON.stringify(chatBody);
    } else {
      body = JSON.stringify({
        ...chatBody,
        googleAPIKey: pluginKeys
          .find((key) => key.pluginId === 'google-search')
          ?.requiredKeys.find((key) => key.key === 'GOOGLE_API_KEY')?.value,
        googleCSEId: pluginKeys
          .find((key) => key.pluginId === 'google-search')
          ?.requiredKeys.find((key) => key.key === 'GOOGLE_CSE_ID')?.value,
      });
    }

    const controller = new AbortController();
    activeControllerRef.current = controller;

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(
          data?.message ||
            response.statusText ||
            'An error occurred. Please try again.',
        );
        return;
      }

      const data = response.body;

      if (!data) {
        return;
      }

      if (plugin) {
        const { answer } = await response.json();

        const updatedMessages: Message[] = [
          ...updatedConversation.messages,
          { role: 'assistant', content: answer },
        ];

        updatedConversation = {
          ...updatedConversation,
          messages: updatedMessages,
        };

        setSelectedConversation(updatedConversation);
        saveConversation(updatedConversation);

        const updatedConversations: Conversation[] = conversations.map(
          (conversation) => {
            if (conversation.id === conversationIdAtSend) {
              return updatedConversation;
            }

            return conversation;
          },
        );

        if (updatedConversations.length === 0) {
          updatedConversations.push(updatedConversation);
        }

        setConversations(updatedConversations);
        saveConversations(updatedConversations);
        return;
      }

      if (!isContinue && updatedConversation.messages.length === 1) {
        const { content } = message!;
        const customName =
          content.length > 30 ? content.substring(0, 30) + '...' : content;

        updatedConversation = {
          ...updatedConversation,
          name: customName,
        };
      }

      setLoading(false);

      const reader = data.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let isFirst = !isContinue;
      let text = '';

      while (!done) {
        if (
          stopConversationRef.current ||
          conversationResetRef.current !== resetToken
        ) {
          controller.abort();
          break;
        }

        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (!value) {
          continue;
        }

        const chunkValue = decoder.decode(value, { stream: true });
        text += chunkValue;

        if (isFirst) {
          isFirst = false;
          const updatedMessages: Message[] = [
            ...updatedConversation.messages,
            { role: 'assistant', content: chunkValue },
          ];

          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages,
          };
        } else {
          const updatedMessages: Message[] = updatedConversation.messages.map(
            (message, index) => {
              if (index === updatedConversation.messages.length - 1) {
                return {
                  ...message,
                  content: text,
                };
              }

              return message;
            },
          );

          updatedConversation = {
            ...updatedConversation,
            messages: updatedMessages,
          };
        }

        if (conversationResetRef.current === resetToken) {
          setSelectedConversation(updatedConversation);
        }
      }

      text += decoder.decode();

      if (conversationResetRef.current !== resetToken) {
        return;
      }

      const continueRequested = text.includes(CONTINUE_SENTINEL);
      const cleanText = text.split(CONTINUE_SENTINEL).join('');

      const finalMessages: Message[] = updatedConversation.messages.map(
        (message, index) => {
          if (index === updatedConversation.messages.length - 1) {
            return {
              ...message,
              content: cleanText,
            };
          }

          return message;
        },
      );

      updatedConversation = {
        ...updatedConversation,
        messages: finalMessages,
      };

      setSelectedConversation(updatedConversation);
      setContinueEnabled(continueRequested);

      saveConversation(updatedConversation);

      const updatedConversations: Conversation[] = conversations.map(
        (conversation) => {
          if (conversation.id === conversationIdAtSend) {
            return updatedConversation;
          }

          return conversation;
        },
      );

      if (updatedConversations.length === 0) {
        updatedConversations.push(updatedConversation);
      }

      setConversations(updatedConversations);
      saveConversations(updatedConversations);
    } catch (error) {
      if ((error as Error)?.name === 'AbortError') {
        return;
      }

      console.error(error);
      toast.error(
        t('An error occurred while streaming the response. Please try again.'),
      );
    } finally {
      activeControllerRef.current = null;
      setLoading(false);
      setMessageIsStreaming(false);
    }
  };

  const handleAbort = () => {
    stopConversationRef.current = true;
    activeControllerRef.current?.abort();
  };

  const handleContinue = () => {
    handleSend(undefined, 0, null, true);
  };

  const abortInFlightStream = () => {
    activeControllerRef.current?.abort();
    activeControllerRef.current = null;
    conversationResetRef.current += 1;
    setLoading(false);
    setMessageIsStreaming(false);
    setContinueEnabled(false);
  };

  // FETCH MODELS ----------------------------------------------

  const updateProviders = (next: AIProvider[]) => {
    setProviders(next);
    localStorage.setItem('providers', JSON.stringify(next));
  };

  const fetchModels = async (provider: AIProvider) => {
    setProviderFetch({ providerId: provider.id, loading: true, error: null });

    const response = await fetch('/api/models', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
      }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch (e) {}

    if (!response.ok) {
      setProviderFetch({
        providerId: provider.id,
        loading: false,
        error:
          data?.error?.message ||
          'Failed to load models. Please check your API key and try again.',
      });
      return;
    }

    setProviders((prev) => {
      const next = prev.map((p) =>
        p.id === provider.id ? { ...p, models: data } : p,
      );
      localStorage.setItem('providers', JSON.stringify(next));
      return next;
    });

    fetchedProvidersRef.current.add(provider.id);
    setProviderFetch({ providerId: provider.id, loading: false, error: null });
  };

  const providerHasServerKey = (provider: AIProvider) =>
    provider.id === 'openai' && serverSideApiKeyIsSet;

  const handleUpdateProvider = (provider: AIProvider) => {
    const prev = providers.find((p) => p.id === provider.id);
    const keyChanged = prev ? prev.apiKey !== provider.apiKey : true;
    const hostChanged = prev ? prev.apiHost !== provider.apiHost : true;

    let updated = provider;
    if ((keyChanged || hostChanged) && provider.models.length > 0) {
      updated = { ...provider, models: [] };
    }

    updateProviders(
      providers.map((p) => (p.id === provider.id ? updated : p)),
    );

    if (keyChanged || hostChanged) {
      fetchedProvidersRef.current.delete(provider.id);
    }

    if (updated.apiKey && updated.models.length === 0) {
      fetchModels(updated);
    }
  };

  const handleSelectProvider = (providerId: string) => {
    if (!providers.some((p) => p.id === providerId)) {
      return;
    }

    setSelectedProviderId(providerId);
    localStorage.setItem('selectedProviderId', providerId);

    if (selectedConversation) {
      handleUpdateConversation(selectedConversation, {
        key: 'providerId',
        value: providerId,
      });
    }

    const provider = providers.find((p) => p.id === providerId);

    if (
      provider &&
      (provider.apiKey || providerHasServerKey(provider)) &&
      provider.models.length === 0
    ) {
      fetchModels(provider);
    }
  };

  const handleAddProvider = (
    name: string,
    apiHost: string,
    apiKey: string,
  ) => {
    const provider: AIProvider = {
      id: `custom-${uuidv4()}`,
      name,
      apiHost,
      apiKey,
      isCustom: true,
      models: [],
    };

    updateProviders([...providers, provider]);

    if (apiKey) {
      fetchModels(provider);
    }
  };

  const handleRemoveProvider = (providerId: string) => {
    const provider = providers.find((p) => p.id === providerId);

    if (!provider || !provider.isCustom) {
      return;
    }

    const next = providers.filter((p) => p.id !== providerId);
    updateProviders(next);
    fetchedProvidersRef.current.delete(providerId);

    if (selectedProviderId === providerId) {
      handleSelectProvider(next[0]?.id || DEFAULT_PROVIDERS[0].id);
    }
  };

  // BASIC HANDLERS --------------------------------------------

  const handleLightMode = (mode: 'dark' | 'light') => {
    setLightMode(mode);
    localStorage.setItem('theme', mode);
  };

  const handleFontSizeChange = (delta: number) => {
    setChatFontSize((prev) => {
      const next = Math.min(22, Math.max(14, prev + delta));
      localStorage.setItem('chatFontSize', String(next));
      return next;
    });
  };

  const handleOpenSettings = () => {
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handlePluginKeyChange = (pluginKey: PluginKey) => {
    if (pluginKeys.some((key) => key.pluginId === pluginKey.pluginId)) {
      const updatedPluginKeys = pluginKeys.map((key) => {
        if (key.pluginId === pluginKey.pluginId) {
          return pluginKey;
        }

        return key;
      });

      setPluginKeys(updatedPluginKeys);

      localStorage.setItem('pluginKeys', JSON.stringify(updatedPluginKeys));
    } else {
      setPluginKeys([...pluginKeys, pluginKey]);

      localStorage.setItem(
        'pluginKeys',
        JSON.stringify([...pluginKeys, pluginKey]),
      );
    }
  };

  const handleClearPluginKey = (pluginKey: PluginKey) => {
    const updatedPluginKeys = pluginKeys.filter(
      (key) => key.pluginId !== pluginKey.pluginId,
    );

    if (updatedPluginKeys.length === 0) {
      setPluginKeys([]);
      localStorage.removeItem('pluginKeys');
      return;
    }

    setPluginKeys(updatedPluginKeys);

    localStorage.setItem('pluginKeys', JSON.stringify(updatedPluginKeys));
  };

  const handleToggleChatbar = () => {
    setShowSidebar(!showSidebar);
    localStorage.setItem('showChatbar', JSON.stringify(!showSidebar));
  };

  const handleTogglePromptbar = () => {
    setShowPromptbar(!showPromptbar);
    localStorage.setItem('showPromptbar', JSON.stringify(!showPromptbar));
  };

  const handleExportData = () => {
    exportData();
  };

  const handleImportConversations = (data: SupportedExportFormats) => {
    const { history, folders, prompts }: LatestExportFormat = importData(data);

    setConversations(history);
    setSelectedConversation(history[history.length - 1]);
    setFolders(folders);
    setPrompts(prompts);
  };

  const handleSelectConversation = (conversation: Conversation) => {
    abortInFlightStream();

    setSelectedConversation(conversation);
    saveConversation(conversation);

    if (
      conversation.providerId &&
      providers.some((p) => p.id === conversation.providerId)
    ) {
      setSelectedProviderId(conversation.providerId);
      localStorage.setItem('selectedProviderId', conversation.providerId);
    }
  };

  // FOLDER OPERATIONS  --------------------------------------------

  const handleCreateFolder = (name: string, type: FolderType) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      type,
    };

    const updatedFolders = [...folders, newFolder];

    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  const handleDeleteFolder = (folderId: string) => {
    const updatedFolders = folders.filter((f) => f.id !== folderId);
    setFolders(updatedFolders);
    saveFolders(updatedFolders);

    const updatedConversations: Conversation[] = conversations.map((c) => {
      if (c.folderId === folderId) {
        return {
          ...c,
          folderId: null,
        };
      }

      return c;
    });
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    const updatedPrompts: Prompt[] = prompts.map((p) => {
      if (p.folderId === folderId) {
        return {
          ...p,
          folderId: null,
        };
      }

      return p;
    });
    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  const handleUpdateFolder = (folderId: string, name: string) => {
    const updatedFolders = folders.map((f) => {
      if (f.id === folderId) {
        return {
          ...f,
          name,
        };
      }

      return f;
    });

    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  // CONVERSATION OPERATIONS  --------------------------------------------

  const handleNewConversation = () => {
    const lastConversation = conversations[conversations.length - 1];

    const newConversation: Conversation = {
      id: uuidv4(),
      name: `${t('New Conversation')}`,
      messages: [],
      model: lastConversation?.model || {
        id: OpenAIModels[defaultModelId].id,
        name: OpenAIModels[defaultModelId].name,
        maxLength: OpenAIModels[defaultModelId].maxLength,
        tokenLimit: OpenAIModels[defaultModelId].tokenLimit,
      },
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      providerId: selectedProviderId,
    };

    const updatedConversations = [...conversations, newConversation];

    setSelectedConversation(newConversation);
    setConversations(updatedConversations);

    saveConversation(newConversation);
    saveConversations(updatedConversations);

    abortInFlightStream();
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    abortInFlightStream();

    const updatedConversations = conversations.filter(
      (c) => c.id !== conversation.id,
    );
    setConversations(updatedConversations);
    saveConversations(updatedConversations);

    if (updatedConversations.length > 0) {
      setSelectedConversation(
        updatedConversations[updatedConversations.length - 1],
      );
      saveConversation(updatedConversations[updatedConversations.length - 1]);
    } else {
      setSelectedConversation({
        id: uuidv4(),
        name: 'New conversation',
        messages: [],
        model: OpenAIModels[defaultModelId],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folderId: null,
        providerId: selectedProviderId,
      });
      localStorage.removeItem('selectedConversation');
    }
  };

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    const updatedConversation = {
      ...conversation,
      [data.key]: data.value,
    };

    const { single, all } = updateConversation(
      updatedConversation,
      conversations,
    );

    setSelectedConversation(single);
    setConversations(all);
  };

  const handleClearConversations = () => {
    abortInFlightStream();

    setConversations([]);
    localStorage.removeItem('conversationHistory');

    setSelectedConversation({
      id: uuidv4(),
      name: 'New conversation',
      messages: [],
      model: OpenAIModels[defaultModelId],
      prompt: DEFAULT_SYSTEM_PROMPT,
      folderId: null,
      providerId: selectedProviderId,
    });
    localStorage.removeItem('selectedConversation');

    const updatedFolders = folders.filter((f) => f.type !== 'chat');
    setFolders(updatedFolders);
    saveFolders(updatedFolders);
  };

  const handleEditMessage = (message: Message, messageIndex: number) => {
    if (selectedConversation) {
      const updatedMessages = selectedConversation.messages
        .map((m, i) => {
          if (i < messageIndex) {
            return m;
          }
        })
        .filter((m) => m) as Message[];

      const updatedConversation = {
        ...selectedConversation,
        messages: updatedMessages,
      };

      const { single, all } = updateConversation(
        updatedConversation,
        conversations,
      );

      setSelectedConversation(single);
      setConversations(all);

      setCurrentMessage(message);
    }
  };

  // PROMPT OPERATIONS --------------------------------------------

  const handleCreatePrompt = () => {
    const newPrompt: Prompt = {
      id: uuidv4(),
      name: `Prompt ${prompts.length + 1}`,
      description: '',
      content: '',
      model: OpenAIModels[defaultModelId],
      folderId: null,
    };

    const updatedPrompts = [...prompts, newPrompt];

    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  const handleUpdatePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.map((p) => {
      if (p.id === prompt.id) {
        return prompt;
      }

      return p;
    });

    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    const updatedPrompts = prompts.filter((p) => p.id !== prompt.id);
    setPrompts(updatedPrompts);
    savePrompts(updatedPrompts);
  };

  // EFFECTS  --------------------------------------------

  useEffect(() => {
    if (currentMessage) {
      handleSend(currentMessage);
      setCurrentMessage(undefined);
    }
  }, [currentMessage]);

  useEffect(() => {
    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }
  }, [selectedConversation]);

  useEffect(() => {
    const provider = providers.find((p) => p.id === selectedProviderId);
    if (!provider) {
      return;
    }

    const hasKey =
      !!provider.apiKey || providerHasServerKey(provider);
    const isFetching =
      providerFetch.providerId === provider.id && providerFetch.loading;

    if (
      hasKey &&
      provider.models.length === 0 &&
      !fetchedProvidersRef.current.has(provider.id) &&
      !isFetching
    ) {
      fetchedProvidersRef.current.add(provider.id);
      fetchModels(provider);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProviderId, providers, providerFetch.loading]);

  // ON LOAD --------------------------------------------

  useEffect(() => {
    const theme = localStorage.getItem('theme');
    if (theme) {
      setLightMode(theme as 'dark' | 'light');
    }

    const storedFontSize = localStorage.getItem('chatFontSize');
    if (storedFontSize) {
      const parsed = parseInt(storedFontSize, 10);
      if (!isNaN(parsed)) {
        setChatFontSize(Math.min(22, Math.max(14, parsed)));
      }
    }

    let loadedProviders: AIProvider[] = [];
    const storedProviders = localStorage.getItem('providers');
    if (storedProviders) {
      try {
        const parsed = JSON.parse(storedProviders);
        if (Array.isArray(parsed) && parsed.length) {
          loadedProviders = parsed;
        }
      } catch (e) {}
    }
    if (loadedProviders.length === 0) {
      loadedProviders = DEFAULT_PROVIDERS.map((p) => ({ ...p, models: [] }));
    }

    const legacyApiKey = localStorage.getItem('apiKey');
    if (legacyApiKey) {
      loadedProviders = loadedProviders.map((p) =>
        p.id === 'openai' ? { ...p, apiKey: legacyApiKey } : p,
      );
      localStorage.removeItem('apiKey');
    }

    let storedSelectedProviderId =
      localStorage.getItem('selectedProviderId') || loadedProviders[0].id;
    if (!loadedProviders.some((p) => p.id === storedSelectedProviderId)) {
      storedSelectedProviderId = loadedProviders[0].id;
    }

    localStorage.setItem('providers', JSON.stringify(loadedProviders));
    setProviders(loadedProviders);
    setSelectedProviderId(storedSelectedProviderId);

    const pluginKeys = localStorage.getItem('pluginKeys');
    if (serverSidePluginKeysSet) {
      setPluginKeys([]);
      localStorage.removeItem('pluginKeys');
    } else if (pluginKeys) {
      setPluginKeys(JSON.parse(pluginKeys));
    }

    if (window.innerWidth < 640) {
      setShowSidebar(false);
    }

    const showChatbar = localStorage.getItem('showChatbar');
    if (showChatbar) {
      setShowSidebar(showChatbar === 'true');
    }

    const showPromptbar = localStorage.getItem('showPromptbar');
    if (showPromptbar) {
      setShowPromptbar(showPromptbar === 'true');
    }

    const folders = localStorage.getItem('folders');
    if (folders) {
      setFolders(JSON.parse(folders));
    }

    const prompts = localStorage.getItem('prompts');
    if (prompts) {
      setPrompts(JSON.parse(prompts));
    }

    const conversationHistory = localStorage.getItem('conversationHistory');
    if (conversationHistory) {
      const parsedConversationHistory: Conversation[] =
        JSON.parse(conversationHistory);
      const cleanedConversationHistory = cleanConversationHistory(
        parsedConversationHistory,
      );
      setConversations(cleanedConversationHistory);
    }

    const selectedConversation = localStorage.getItem('selectedConversation');
    if (selectedConversation) {
      const parsedSelectedConversation: Conversation =
        JSON.parse(selectedConversation);
      const cleanedSelectedConversation = cleanSelectedConversation(
        parsedSelectedConversation,
      );
      setSelectedConversation(cleanedSelectedConversation);
    } else {
      setSelectedConversation({
        id: uuidv4(),
        name: 'New conversation',
        messages: [],
        model: OpenAIModels[defaultModelId],
        prompt: DEFAULT_SYSTEM_PROMPT,
        folderId: null,
        providerId: storedSelectedProviderId,
      });
    }
  }, [serverSideApiKeyIsSet]);

  // DERIVED ----------------------------------------------

  const selectedProvider =
    providers.find((p) => p.id === selectedProviderId) || providers[0];
  const activeProvider =
    providers.find(
      (p) => p.id === (selectedConversation?.providerId || selectedProviderId),
    ) ||
    selectedProvider;
  const hasProviderKey =
    providers.some((p) => p.apiKey) || serverSideApiKeyIsSet;
  const models: OpenAIModel[] = activeProvider?.models || [];

  const isSelectedFetchError =
    providerFetch.providerId === selectedProviderId && !!providerFetch.error;
  const modelError: ErrorMessage | null = isSelectedFetchError
    ? ({
        title: t('Error fetching models.'),
        code: null,
        messageLines: [
          providerFetch.error || '',
          t(
            'If you completed this step, the provider may be experiencing issues.',
          ),
        ],
      } as ErrorMessage)
    : null;

  const providerUsageUrl =
    activeProvider?.id === 'openai'
      ? 'https://platform.openai.com/account/usage'
      : undefined;

  return (
    <>
      <Head>
        <title>Chatbot UI</title>
        <meta name="description" content="ChatGPT but better." />
        <meta
          name="viewport"
          content="height=device-height ,width=device-width, initial-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      {selectedConversation && (
        <main
          className={`flex h-screen w-screen flex-col text-sm text-white dark:text-white ${lightMode}`}
        >
          <div className="fixed top-0 w-full sm:hidden">
            <Navbar
              selectedConversation={selectedConversation}
              onNewConversation={handleNewConversation}
              onOpenSettings={handleOpenSettings}
            />
          </div>

          <div className="flex h-full w-full pt-[48px] sm:pt-0">
            {showSidebar ? (
              <div>
                <Chatbar
                  loading={messageIsStreaming}
                  conversations={conversations}
                  selectedConversation={selectedConversation}
                  folders={folders.filter((folder) => folder.type === 'chat')}
                  onCreateFolder={(name) => handleCreateFolder(name, 'chat')}
                  onDeleteFolder={handleDeleteFolder}
                  onUpdateFolder={handleUpdateFolder}
                  onNewConversation={handleNewConversation}
                  onSelectConversation={handleSelectConversation}
                  onDeleteConversation={handleDeleteConversation}
                  onUpdateConversation={handleUpdateConversation}
                />

                <button
                  className="fixed top-5 left-[270px] z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:left-[270px] sm:h-8 sm:w-8 sm:text-neutral-700"
                  onClick={handleToggleChatbar}
                >
                  <IconArrowBarLeft />
                </button>
                <div
                  onClick={handleToggleChatbar}
                  className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
                ></div>
              </div>
            ) : (
              <button
                className="fixed top-2.5 left-4 z-50 h-7 w-7 text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:left-4 sm:h-8 sm:w-8 sm:text-neutral-700"
                onClick={handleToggleChatbar}
              >
                <IconArrowBarRight />
              </button>
            )}

            <div className="flex flex-1">
              <Chat
                conversation={selectedConversation}
                messageIsStreaming={messageIsStreaming}
                hasProviderKey={hasProviderKey}
                providerName={activeProvider?.name || 'AI'}
                providerUsageUrl={providerUsageUrl}
                modelError={modelError}
                models={models}
                loading={loading}
                prompts={prompts}
                fontSize={chatFontSize}
                onFontSizeChange={handleFontSizeChange}
                onOpenSettings={handleOpenSettings}
                onSend={handleSend}
                onUpdateConversation={handleUpdateConversation}
                onEditMessage={handleEditMessage}
                stopConversationRef={stopConversationRef}
                onStop={handleAbort}
                showContinue={continueEnabled}
                onContinue={handleContinue}
              />
            </div>

            {showPromptbar ? (
              <div>
                <Promptbar
                  prompts={prompts}
                  folders={folders.filter((folder) => folder.type === 'prompt')}
                  onCreatePrompt={handleCreatePrompt}
                  onUpdatePrompt={handleUpdatePrompt}
                  onDeletePrompt={handleDeletePrompt}
                  onCreateFolder={(name) => handleCreateFolder(name, 'prompt')}
                  onDeleteFolder={handleDeleteFolder}
                  onUpdateFolder={handleUpdateFolder}
                />
                <button
                  className="fixed top-5 right-[270px] z-50 h-7 w-7 hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:right-[270px] sm:h-8 sm:w-8 sm:text-neutral-700"
                  onClick={handleTogglePromptbar}
                >
                  <IconArrowBarRight />
                </button>
                <div
                  onClick={handleTogglePromptbar}
                  className="absolute top-0 left-0 z-10 h-full w-full bg-black opacity-70 sm:hidden"
                ></div>
              </div>
            ) : (
              <button
                className="fixed top-2.5 right-4 z-50 h-7 w-7 text-white hover:text-gray-400 dark:text-white dark:hover:text-gray-300 sm:top-0.5 sm:right-4 sm:h-8 sm:w-8 sm:text-neutral-700"
                onClick={handleTogglePromptbar}
              >
                <IconArrowBarLeft />
              </button>
            )}
          </div>

          <SettingsDrawer
            open={showSettings}
            lightMode={lightMode}
            providers={providers}
            selectedProviderId={selectedProviderId}
            loadingProviderId={
              providerFetch.loading ? providerFetch.providerId : null
            }
            loadErrorProviderId={
              providerFetch.error ? providerFetch.providerId : null
            }
            loadError={providerFetch.error}
            pluginKeys={pluginKeys}
            conversationsCount={conversations.length}
            onClose={handleCloseSettings}
            onToggleLightMode={handleLightMode}
            onUpdateProvider={handleUpdateProvider}
            onSelectProvider={handleSelectProvider}
            onAddProvider={handleAddProvider}
            onRemoveProvider={handleRemoveProvider}
            onClearConversations={handleClearConversations}
            onExportConversations={handleExportData}
            onImportConversations={handleImportConversations}
            onPluginKeyChange={handlePluginKeyChange}
            onClearPluginKey={handleClearPluginKey}
          />
        </main>
      )}
    </>
  );
};
export default Home;

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  const defaultModelId =
    (process.env.DEFAULT_MODEL &&
      Object.values(OpenAIModelID).includes(
        process.env.DEFAULT_MODEL as OpenAIModelID,
      ) &&
      process.env.DEFAULT_MODEL) ||
    fallbackModelID;

  let serverSidePluginKeysSet = false;

  const googleApiKey = process.env.GOOGLE_API_KEY;
  const googleCSEId = process.env.GOOGLE_CSE_ID;

  if (googleApiKey && googleCSEId) {
    serverSidePluginKeysSet = true;
  }

  return {
    props: {
      serverSideApiKeyIsSet: !!process.env.OPENAI_API_KEY,
      defaultModelId,
      serverSidePluginKeysSet,
      ...(await serverSideTranslations(locale ?? 'en', [
        'common',
        'chat',
        'sidebar',
        'markdown',
        'promptbar',
      ])),
    },
  };
};
