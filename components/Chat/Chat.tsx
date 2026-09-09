import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import { OpenAIModel } from '@/types/openai';
import { Plugin } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { throttle } from '@/utils';
import {
  IconArrowDown,
  IconChevronDown,
  IconSettings,
  IconLetterA,
  IconArrowBigUp,
  IconArrowBigDown,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import {
  FC,
  MutableRefObject,
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Spinner } from '../Global/Spinner';
import { ChatInput } from './ChatInput';
import { ChatLoader } from './ChatLoader';
import { ChatMessage } from './ChatMessage';
import { ErrorMessageDiv } from './ErrorMessageDiv';
import { ModelSelect } from './ModelSelect';
import { SystemPrompt } from './SystemPrompt';

interface Props {
  conversation: Conversation;
  models: OpenAIModel[];
  hasProviderKey: boolean;
  providerName: string;
  providerUsageUrl?: string;
  messageIsStreaming: boolean;
  modelError: ErrorMessage | null;
  loading: boolean;
  prompts: Prompt[];
  fontSize: number;
  onFontSizeChange: (delta: number) => void;
  onOpenSettings: () => void;
  onSend: (
    message: Message,
    deleteCount: number,
    plugin: Plugin | null,
  ) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  onEditMessage: (message: Message, messageIndex: number) => void;
  stopConversationRef: MutableRefObject<boolean>;
  onStop: () => void;
  showContinue: boolean;
  onContinue: () => void;
}

const FONT_MIN = 14;
const FONT_MAX = 22;

export const Chat: FC<Props> = memo(
  ({
    conversation,
    models,
    hasProviderKey,
    providerName,
    providerUsageUrl,
    messageIsStreaming,
    modelError,
    loading,
    prompts,
    fontSize,
    onFontSizeChange,
    onOpenSettings,
    onSend,
    onUpdateConversation,
    onEditMessage,
    stopConversationRef,
    onStop,
    showContinue,
    onContinue,
  }) => {
    const { t } = useTranslation('chat');
    const [currentMessage, setCurrentMessage] = useState<Message>();
    const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
    const [showSettings, setShowSettings] = useState<boolean>(false);
    const [showScrollDownButton, setShowScrollDownButton] =
      useState<boolean>(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const scrollToBottom = useCallback(() => {
      if (autoScrollEnabled) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        textareaRef.current?.focus();
      }
    }, [autoScrollEnabled]);

    const handleScroll = () => {
      if (chatContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } =
          chatContainerRef.current;
        const bottomTolerance = 30;

        if (scrollTop + clientHeight < scrollHeight - bottomTolerance) {
          setAutoScrollEnabled(false);
          setShowScrollDownButton(true);
        } else {
          setAutoScrollEnabled(true);
          setShowScrollDownButton(false);
        }
      }
    };

    const handleScrollDown = () => {
      chatContainerRef.current?.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    };

    const handleSettings = () => {
      setShowSettings(!showSettings);
    };

    const onClearAll = () => {
      if (confirm(t<string>('Are you sure you want to clear all messages?'))) {
        onUpdateConversation(conversation, { key: 'messages', value: [] });
      }
    };

    const scrollDown = () => {
      if (autoScrollEnabled) {
        messagesEndRef.current?.scrollIntoView(true);
      }
    };
    const throttledScrollDown = throttle(scrollDown, 250);

    useEffect(() => {
      throttledScrollDown();
      setCurrentMessage(
        conversation.messages[conversation.messages.length - 2],
      );
    }, [conversation.messages, throttledScrollDown]);

    useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setAutoScrollEnabled(entry.isIntersecting);
          if (entry.isIntersecting) {
            textareaRef.current?.focus();
          }
        },
        {
          root: null,
          threshold: 0.5,
        },
      );
      const messagesEndElement = messagesEndRef.current;
      if (messagesEndElement) {
        observer.observe(messagesEndElement);
      }
      return () => {
        if (messagesEndElement) {
          observer.unobserve(messagesEndElement);
        }
      };
    }, [messagesEndRef]);

    return (
      <div className="relative flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#343541]">
        <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-black/10 px-3 dark:border-white/10">
          <button
            className="flex min-w-0 items-center gap-1.5 text-left hover:opacity-80"
            onClick={handleSettings}
            title={t('Model settings') as string}
          >
            <span className="max-w-[230px] truncate text-sm font-medium text-black dark:text-white">
              {`${providerName} · ${conversation.model.name}`}
            </span>
            {conversation.model.isFree && (
              <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-green-600 dark:text-green-400">
                {t('Free')}
              </span>
            )}
            <IconChevronDown size={14} className="shrink-0 text-neutral-400" />
          </button>

          <div className="flex items-center gap-1.5">
            <button
              className="flex items-center gap-1 rounded-md border border-black/10 px-2 py-1.5 text-sm text-black transition-colors hover:bg-neutral-200 disabled:opacity-40 dark:border-white/10 dark:text-white dark:hover:bg-gray-500/10"
              title={t('Decrease text size') as string}
              disabled={fontSize <= FONT_MIN}
              onClick={() => onFontSizeChange(-1)}
            >
              <IconLetterA size={15} />
              <IconArrowBigDown size={13} />
            </button>
            <button
              className="flex items-center gap-1 rounded-md border border-black/10 px-2 py-1.5 text-sm text-black transition-colors hover:bg-neutral-200 disabled:opacity-40 dark:border-white/10 dark:text-white dark:hover:bg-gray-500/10"
              title={t('Increase text size') as string}
              disabled={fontSize >= FONT_MAX}
              onClick={() => onFontSizeChange(1)}
            >
              <IconLetterA size={15} />
              <IconArrowBigUp size={13} />
            </button>
            <button
              className="rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-900 dark:text-neutral-300 dark:hover:bg-gray-500/10 dark:hover:text-white"
              onClick={onOpenSettings}
              title={t('Settings') as string}
            >
              <IconSettings size={19} />
            </button>
          </div>
        </div>

        {showSettings && !modelError && (
          <div className="shrink-0 border-b border-black/10 bg-neutral-50 p-4 dark:border-white/10 dark:bg-[#2a2b32]">
            <div className="mx-auto flex flex-col gap-3 md:max-w-2xl">
              <ModelSelect
                model={conversation.model}
                models={models}
                providerName={providerName}
                usageUrl={providerUsageUrl}
                onModelChange={(model) =>
                  onUpdateConversation(conversation, {
                    key: 'model',
                    value: model,
                  })
                }
              />
              <SystemPrompt
                conversation={conversation}
                prompts={prompts}
                onChangePrompt={(prompt) =>
                  onUpdateConversation(conversation, {
                    key: 'prompt',
                    value: prompt,
                  })
                }
              />
              <button
                className="mx-auto rounded border border-neutral-300 px-4 py-1.5 text-sm text-neutral-700 hover:bg-neutral-200 dark:border-neutral-600 dark:text-neutral-200 dark:hover:bg-gray-500/10"
                onClick={onClearAll}
              >
                {t('Clear messages')}
              </button>
            </div>
          </div>
        )}

        <div className="relative min-h-0 flex-1">
          {!hasProviderKey ? (
            <div className="flex h-full items-center justify-center overflow-y-auto">
              <div className="mx-auto flex h-full w-[300px] flex-col justify-center space-y-6 sm:w-[600px]">
                <div className="text-center text-4xl font-bold text-black dark:text-white">
                  Welcome to Chatbot UI
                </div>
                <div className="text-center text-lg text-black dark:text-white">
                  <div className="mb-8">{`Chatbot UI is an open source clone of OpenAI's ChatGPT UI.`}</div>
                  <div className="mb-2 font-bold">
                    Important: Chatbot UI is 100% unaffiliated with OpenAI.
                  </div>
                </div>
                <div className="text-center text-gray-500 dark:text-gray-400">
                  <div className="mb-2">
                    Chatbot UI allows you to plug in your API keys to use this
                    UI with any OpenAI-compatible provider.
                  </div>
                  <div className="mb-2">
                    It is <span className="italic">only</span> used to
                    communicate with the provider&apos;s API.
                  </div>
                  <div className="mb-2">
                    {t(
                      'Please set your API keys in the bottom left of the sidebar.',
                    )}
                  </div>
                  <div>
                    {t(
                      "If you don't have an API key, you can get one from your provider (e.g. openai.com, openrouter.ai): ",
                    )}
                    <a
                      href="https://platform.openai.com/account/api-keys"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      providers
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ) : modelError ? (
            <ErrorMessageDiv error={modelError} />
          ) : (
            <>
              <div
                className="h-full overflow-x-hidden overflow-y-auto"
                ref={chatContainerRef}
                onScroll={handleScroll}
              >
                {conversation.messages.length === 0 ? (
                  <>
                    <div className="mx-auto flex w-[350px] flex-col space-y-10 pt-12 sm:w-[600px]">
                      <div className="text-center text-3xl font-semibold text-gray-800 dark:text-gray-100">
                        {models.length === 0 ? (
                          <div>
                            <Spinner size="16px" className="mx-auto" />
                          </div>
                        ) : (
                          'Chatbot UI'
                        )}
                      </div>

                      {models.length > 0 && (
                        <div className="flex h-full flex-col space-y-4 rounded-lg border border-neutral-200 p-4 dark:border-neutral-600">
                          <ModelSelect
                            model={conversation.model}
                            models={models}
                            providerName={providerName}
                            usageUrl={providerUsageUrl}
                            onModelChange={(model) =>
                              onUpdateConversation(conversation, {
                                key: 'model',
                                value: model,
                              })
                            }
                          />

                          <SystemPrompt
                            conversation={conversation}
                            prompts={prompts}
                            onChangePrompt={(prompt) =>
                              onUpdateConversation(conversation, {
                                key: 'prompt',
                                value: prompt,
                              })
                            }
                          />
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {conversation.messages.map((message, index) => (
                      <ChatMessage
                        key={index}
                        message={message}
                        messageIndex={index}
                        fontSize={fontSize}
                        onEditMessage={onEditMessage}
                      />
                    ))}

                    {loading && <ChatLoader />}

                    <div
                      className="h-[162px] bg-white dark:bg-[#343541]"
                      ref={messagesEndRef}
                    />
                  </>
                )}
              </div>

              <ChatInput
                stopConversationRef={stopConversationRef}
                textareaRef={textareaRef}
                messageIsStreaming={messageIsStreaming}
                conversationIsEmpty={conversation.messages.length === 0}
                model={conversation.model}
                prompts={prompts}
                fontSize={fontSize}
                onStop={onStop}
                showContinue={showContinue}
                onContinue={onContinue}
                onSend={(message, plugin) => {
                  setCurrentMessage(message);
                  onSend(message, 0, plugin);
                }}
                onRegenerate={() => {
                  if (currentMessage) {
                    onSend(currentMessage, 2, null);
                  }
                }}
              />
            </>
          )}

          {showScrollDownButton && (
            <div className="absolute bottom-0 right-0 mb-4 mr-4 pb-20">
              <button
                className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-300 text-gray-800 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-neutral-200"
                onClick={handleScrollDown}
              >
                <IconArrowDown size={18} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  },
);
Chat.displayName = 'Chat';