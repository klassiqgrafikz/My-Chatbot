import { Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { ErrorMessage } from '@/types/error';
import { OpenAIModel } from '@/types/openai';
import { Plugin } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { throttle } from '@/utils';
import { IconArrowDown } from '@tabler/icons-react';
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

const SUGGESTIONS: string[] = [
  'Explain why the sky is blue in simple terms',
  'Write a short story about a robot learning to paint',
  'Give me 5 ideas for a weekend hobby',
  'Summarize the plot of the movie Inception',
];

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

    const handleRegenerate = () => {
      if (currentMessage) {
        onSend(currentMessage, 2, null);
      }
    };

    return (
      <div className="relative flex h-full min-w-0 flex-1 flex-col bg-white dark:bg-[#343541]">
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
                <div className="text-center text-gray-500 dark:text-gray-300">
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
                  <div className="flex h-full flex-col items-center justify-center space-y-6 px-4">
                    <div className="text-center text-2xl font-semibold text-black dark:text-white sm:text-3xl">
                      {models.length === 0 ? (
                        <div>
                          <Spinner size="16px" className="mx-auto" />
                        </div>
                      ) : (
                        t('What can I help with?')
                      )}
                    </div>

                    {models.length > 0 && (
                      <div className="grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                        {SUGGESTIONS.map((suggestion) => (
                          <button
                            key={suggestion}
                            className="cursor-pointer rounded-2xl border border-black/10 p-4 text-left text-sm text-neutral-600 transition-colors duration-200 hover:bg-black/5 dark:border-white/10 dark:text-neutral-300 dark:hover:bg-white/5"
                            disabled={messageIsStreaming}
                            onClick={() =>
                              onSend(
                                { role: 'user', content: suggestion },
                                0,
                                null,
                              )
                            }
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {conversation.messages.map((message, index) => (
                      <ChatMessage
                        key={index}
                        message={message}
                        messageIndex={index}
                        fontSize={fontSize}
                        isStreaming={
                          messageIsStreaming &&
                          index === conversation.messages.length - 1
                        }
                        onEditMessage={onEditMessage}
                        onRegenerate={handleRegenerate}
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
                model={conversation.model}
                models={models}
                providerName={providerName}
                usageUrl={providerUsageUrl}
                conversation={conversation}
                conversationIsEmpty={conversation.messages.length === 0}
                prompts={prompts}
                fontSize={fontSize}
                onStop={onStop}
                showContinue={showContinue}
                onContinue={onContinue}
                onUpdateConversation={onUpdateConversation}
                onSend={(message, plugin) => {
                  setCurrentMessage(message);
                  onSend(message, 0, plugin);
                }}
                onRegenerate={handleRegenerate}
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