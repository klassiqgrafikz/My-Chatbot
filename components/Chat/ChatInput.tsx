import { Attachment, Conversation, Message } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { OpenAIModel } from '@/types/openai';
import { Plugin } from '@/types/plugin';
import { Prompt } from '@/types/prompt';
import { VoiceSettings } from '@/types/voice';
import {
  MAX_FILES_PER_MESSAGE,
  MAX_IMAGES_PER_MESSAGE,
  MAX_TOTAL_BYTES,
  fileToAttachment,
  formatMB,
  isImageFile,
} from '@/utils/app/attachments';
import {
  IconBolt,
  IconBrandGoogle,
  IconChevronDown,
  IconFile,
  IconFileText,
  IconFolder,
  IconPaperclip,
  IconPlayerPlay,
  IconPlayerStop,
  IconRepeat,
  IconSend,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import toast from 'react-hot-toast';
import {
  FC,
  KeyboardEvent,
  MutableRefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { ModelSelect } from './ModelSelect';
import { ConfirmDialog } from './ConfirmDialog';
import { PluginSelect } from './PluginSelect';
import { PromptList } from './PromptList';
import { SystemPrompt } from './SystemPrompt';
import { VariableModal } from './VariableModal';
import { VoiceRecorder } from './VoiceRecorder';

interface Props {
  messageIsStreaming: boolean;
  model: OpenAIModel;
  models: OpenAIModel[];
  providerName: string;
  usageUrl?: string;
  conversation: Conversation;
  conversationIsEmpty: boolean;
  prompts: Prompt[];
  fontSize: number;
  voice?: VoiceSettings;
  onSend: (message: Message, plugin: Plugin | null) => void;
  onRegenerate: () => void;
  onStop: () => void;
  showContinue: boolean;
  onContinue: () => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  stopConversationRef: MutableRefObject<boolean>;
  textareaRef: MutableRefObject<HTMLTextAreaElement | null>;
}

export const ChatInput: FC<Props> = ({
  messageIsStreaming,
  model,
  models,
  providerName,
  usageUrl,
  conversation,
  conversationIsEmpty,
  prompts,
  onSend,
  onRegenerate,
  onStop,
  showContinue,
  onContinue,
  onUpdateConversation,
  stopConversationRef,
  textareaRef,
  fontSize,
  voice,
}) => {
  const { t } = useTranslation('chat');

  const [content, setContent] = useState<string>();
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [showPromptList, setShowPromptList] = useState(false);
  const [activePromptIndex, setActivePromptIndex] = useState(0);
  const [promptInputValue, setPromptInputValue] = useState('');
  const [variables, setVariables] = useState<string[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showPluginSelect, setShowPluginSelect] = useState(false);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [plugin, setPlugin] = useState<Plugin | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingSizeMb, setPendingSizeMb] = useState(0);
  const [pendingAboveCap, setPendingAboveCap] = useState(false);

  const promptListRef = useRef<HTMLUListElement | null>(null);
  const attachMenuRef = useRef<HTMLDivElement>(null);
  const filesInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const filteredPrompts = prompts.filter((prompt) =>
    prompt.name.toLowerCase().includes(promptInputValue.toLowerCase()),
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const maxLength = model.maxLength;

    if (value.length > maxLength) {
      alert(
        t(
          `Message limit is {{maxLength}} characters. You have entered {{valueLength}} characters.`,
          { maxLength, valueLength: value.length },
        ),
      );
      return;
    }

    setContent(value);
    updatePromptListVisibility(value);
  };

  const handleSend = () => {
    if (messageIsStreaming) {
      return;
    }

    if (!content && attachments.length === 0) {
      alert(t('Please enter a message'));
      return;
    }

    onSend(
      {
        role: 'user',
        content: content || '',
        ...(attachments.length > 0 ? { attachments } : {}),
      },
      plugin,
    );
    setContent('');
    setAttachments([]);
    setPlugin(null);
    setShowAttachMenu(false);

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const handleVoiceTranscript = (transcript: string) => {
    if (messageIsStreaming) {
      return;
    }

    const combined = content?.trim()
      ? `${content.trim()} ${transcript}`
      : transcript;

    if (!combined.trim()) {
      return;
    }

    onSend({ role: 'user', content: combined.trim() }, plugin);
    setContent('');
    setAttachments([]);
    setPlugin(null);
    setShowAttachMenu(false);

    if (window.innerWidth < 640 && textareaRef && textareaRef.current) {
      textareaRef.current.blur();
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const onFilesPicked = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    setShowAttachMenu(false);

    const files = Array.from(fileList);
    const incomingBytes = files.reduce((sum, file) => sum + file.size, 0);
    const existingBytes = attachments.reduce(
      (sum, a) => sum + (a.dataUrl?.length || 0) + (a.rawText?.length || 0),
      0,
    );

    setPendingFiles(files);
    setPendingSizeMb(incomingBytes / (1024 * 1024));
    setPendingAboveCap(incomingBytes + existingBytes > MAX_TOTAL_BYTES);
  };

  const acceptPendingFiles = () => {
    setPendingFiles(null);
    if (pendingFiles) {
      addFiles(pendingFiles);
    }
  };

  const declinePendingFiles = () => {
    setPendingFiles(null);
  };

  const addFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    setShowAttachMenu(false);

    const incoming = files;
    const existingCount = attachments.length;

    let imageCount = attachments.filter((a) => a.type === 'image').length;
    const result: Attachment[] = [];

    for (const file of incoming) {
      if (existingCount + result.length >= MAX_FILES_PER_MESSAGE) {
        toast.error(
          t('Maximum {{n}} files per message.', {
            n: MAX_FILES_PER_MESSAGE,
          }),
        );
        break;
      }

      if (isImageFile(file)) {
        if (!model.supportsVision) {
          toast.error(t("Selected model doesn't support images."));
          continue;
        }
        if (imageCount >= MAX_IMAGES_PER_MESSAGE) {
          toast.error(
            t('Maximum {{n}} images per message.', {
              n: MAX_IMAGES_PER_MESSAGE,
            }),
          );
          break;
        }
      }

      try {
        const attachment = await fileToAttachment(file, !!model.supportsVision);
        if (attachment.type === 'image') {
          imageCount++;
        }
        result.push(attachment);
      } catch (error) {
        console.error('Failed to read file', file.name, error);
        toast.error(t('Could not read {{name}}.', { name: file.name }));
      }
    }

    if (result.length > 0) {
      setAttachments((prev) => [...prev, ...result]);
    }
  };

  const handleStopConversation = () => {
    onStop();
    stopConversationRef.current = true;
    setTimeout(() => {
      stopConversationRef.current = false;
    }, 1000);
  };

  const isMobile = () => {
    const userAgent =
      typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile|mobile|CriOS/i;
    return mobileRegex.test(userAgent);
  };

  const handleInitModal = () => {
    const selectedPrompt = filteredPrompts[activePromptIndex];
    if (selectedPrompt) {
      setContent((prevContent) => {
        const newContent = prevContent?.replace(
          /\/\w*$/,
          selectedPrompt.content,
        );
        return newContent;
      });
      handlePromptSelect(selectedPrompt);
    }
    setShowPromptList(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (showPromptList) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : prevIndex,
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex > 0 ? prevIndex - 1 : prevIndex,
        );
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setActivePromptIndex((prevIndex) =>
          prevIndex < prompts.length - 1 ? prevIndex + 1 : 0,
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleInitModal();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setShowPromptList(false);
      } else {
        setActivePromptIndex(0);
      }
    } else if (e.key === 'Enter' && !isTyping && !isMobile() && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    } else if (e.key === '/' && e.metaKey) {
      e.preventDefault();
      setShowPluginSelect(!showPluginSelect);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setShowModelPicker(false);
      setShowAttachMenu(false);
    }
  };

  const parseVariables = (content: string) => {
    const regex = /{{(.*?)}}/g;
    const foundVariables = [];
    let match;

    while ((match = regex.exec(content)) !== null) {
      foundVariables.push(match[1]);
    }

    return foundVariables;
  };

  const updatePromptListVisibility = useCallback((text: string) => {
    const match = text.match(/\/\w*$/);

    if (match) {
      setShowPromptList(true);
      setPromptInputValue(match[0].slice(1));
    } else {
      setShowPromptList(false);
      setPromptInputValue('');
    }
  }, []);

  const handlePromptSelect = (prompt: Prompt) => {
    const parsedVariables = parseVariables(prompt.content);
    setVariables(parsedVariables);

    if (parsedVariables.length > 0) {
      setIsModalVisible(true);
    } else {
      setContent((prevContent) => {
        const updatedContent = prevContent?.replace(/\/\w*$/, prompt.content);
        return updatedContent;
      });
      updatePromptListVisibility(prompt.content);
    }
  };

  const handleSubmit = (updatedVariables: string[]) => {
    const newContent = content?.replace(/{{(.*?)}}/g, (match, variable) => {
      const index = variables.indexOf(variable);
      return updatedVariables[index];
    });

    setContent(newContent);

    if (textareaRef && textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  useEffect(() => {
    if (promptListRef.current) {
      promptListRef.current.scrollTop = activePromptIndex * 30;
    }
  }, [activePromptIndex]);

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = 'inherit';
      textareaRef.current.style.height = `${textareaRef.current?.scrollHeight}px`;
      textareaRef.current.style.overflow = `${
        textareaRef?.current?.scrollHeight > 400 ? 'auto' : 'hidden'
      }`;
    }
  }, [content]);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        promptListRef.current &&
        !promptListRef.current.contains(e.target as Node)
      ) {
        setShowPromptList(false);
      }

      if (
        attachMenuRef.current &&
        !attachMenuRef.current.contains(e.target as Node)
      ) {
        setShowAttachMenu(false);
      }
    };

    window.addEventListener('click', handleOutsideClick);

    return () => {
      window.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  return (
    <div className="absolute bottom-0 left-0 w-full border-transparent bg-gradient-to-b from-transparent via-white to-white pt-4 pb-[env(safe-area-inset-bottom)] dark:border-white/20 dark:via-[#343541] dark:to-[#343541] md:pt-2">
      <div className="mx-2 mt-4 flex flex-col last:mb-2 md:mx-4 md:mt-[52px] md:last:mb-6 lg:mx-auto lg:max-w-3xl">
        {messageIsStreaming && (
          <button
            className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2"
            onClick={handleStopConversation}
          >
            <IconPlayerStop size={16} /> {t('Stop Generating')}
          </button>
        )}

        {!messageIsStreaming && !conversationIsEmpty && showContinue && (
          <button
            className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2"
            onClick={onContinue}
          >
            <IconPlayerPlay size={16} /> {t('Continue generating')}
          </button>
        )}

        {!messageIsStreaming && !conversationIsEmpty && !showContinue && (
          <button
            className="absolute top-0 left-0 right-0 mx-auto mb-3 flex w-fit items-center gap-3 rounded border border-neutral-200 bg-white py-2 px-4 text-black hover:opacity-50 dark:border-neutral-600 dark:bg-[#343541] dark:text-white md:mb-0 md:mt-2"
            onClick={onRegenerate}
          >
            <IconRepeat size={16} /> {t('Regenerate response')}
          </button>
        )}

        {showModelPicker && (
          <div className="z-10 mb-2 max-h-[60vh] overflow-y-auto rounded-lg border border-neutral-200 bg-white p-4 shadow-xl dark:border-neutral-600 dark:bg-[#2a2b32]">
            <div className="flex flex-col gap-3">
              <ModelSelect
                model={model}
                models={models}
                providerName={providerName}
                usageUrl={usageUrl}
                onModelChange={(nextModel) =>
                  onUpdateConversation(conversation, {
                    key: 'model',
                    value: nextModel,
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
                onClick={() =>
                  onUpdateConversation(conversation, {
                    key: 'messages',
                    value: [],
                  })
                }
              >
                {t('Clear messages')}
              </button>
            </div>
          </div>
        )}

        <div className="relative flex w-full flex-col">
          <div className="relative flex flex-col rounded-[24px] border border-black/10 bg-white px-2 py-1.5 shadow-[0_0_10px_rgba(0,0,0,0.10)] dark:border-gray-900/50 dark:bg-[#40414F] dark:text-white dark:shadow-[0_0_15px_rgba(0,0,0,0.10)] md:rounded-[28px] md:py-2">
            {attachments.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pb-1 pl-1">
                {attachments.map((attachment, index) => (
                  <div
                    key={`${attachment.fileName}-${index}`}
                    className="relative"
                  >
                    {attachment.type === 'image' ? (
                      <div className="relative h-14 w-14 overflow-hidden rounded-lg">
                        <img
                          src={attachment.dataUrl}
                          alt={attachment.fileName}
                          className="h-full w-full object-cover"
                        />
                        <button
                          className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
                          onClick={() => removeAttachment(index)}
                          title={t('Remove') as string}
                        >
                          <IconX size={10} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 rounded-md bg-black/5 py-1 pr-1 pl-1.5 text-xs dark:bg-white/10">
                        {attachment.extracted ? (
                          <IconFileText
                            size={13}
                            className="shrink-0 text-neutral-500"
                          />
                        ) : (
                          <IconFile
                            size={13}
                            className="shrink-0 text-neutral-500"
                          />
                        )}
                        <span className="max-w-[140px] truncate">
                          {attachment.fileName}
                        </span>
                        <button
                          className="flex h-4 w-4 items-center justify-center rounded-full text-neutral-500 hover:bg-black/10 dark:text-neutral-300 dark:hover:bg-white/10"
                          onClick={() => removeAttachment(index)}
                          title={t('Remove') as string}
                        >
                          <IconX size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end">
              <div ref={attachMenuRef} className="relative">
                <button
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/5 disabled:opacity-40 dark:text-neutral-300 dark:hover:bg-white/10 md:h-9 md:w-9"
                  onClick={() => {
                    setShowPluginSelect(false);
                    setShowPromptList(false);
                    setShowAttachMenu(!showAttachMenu);
                  }}
                  disabled={!!plugin}
                  title={
                    plugin
                      ? (t('Uploads are not available with plugins') as string)
                      : (t('Attach files') as string)
                  }
                >
                  <IconPaperclip size={20} />
                </button>

                {showAttachMenu && (
                  <div className="absolute bottom-full left-0 z-30 mb-2 w-52 rounded-lg border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-600 dark:bg-[#343541]">
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-sm text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10"
                      onClick={() => filesInputRef.current?.click()}
                    >
                      <IconPaperclip size={16} />
                      {t('Upload files')}
                    </button>
                    <button
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2.5 text-left text-sm text-neutral-700 hover:bg-black/5 dark:text-neutral-200 dark:hover:bg-white/10"
                      onClick={() => folderInputRef.current?.click()}
                    >
                      <IconFolder size={16} />
                      {t('Upload folder')}
                    </button>
                  </div>
                )}

                <input
                  ref={filesInputRef}
                  type="file"
                  multiple
                  hidden
                  onChange={(e) => {
                    onFilesPicked(e.target.files);
                    e.target.value = '';
                  }}
                />
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  hidden
                  {...({ webkitdirectory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
                  onChange={(e) => {
                    onFilesPicked(e.target.files);
                    e.target.value = '';
                  }}
                />
              </div>

              <button
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-neutral-500 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10 md:h-9 md:w-9"
                onClick={() => {
                  setShowAttachMenu(false);
                  setShowPluginSelect(!showPluginSelect);
                }}
              >
              {plugin ? (
                <IconBrandGoogle size={20} />
              ) : (
                <IconBolt size={20} />
              )}
            </button>

            {voice && voice.enabled && (
              <VoiceRecorder
                apiKey={voice.fishApiKey}
                language={voice.language}
                disabled={messageIsStreaming}
                onTranscript={handleVoiceTranscript}
              />
            )}

            <textarea
              ref={textareaRef}
              className="m-0 w-full flex-1 resize-none border-0 bg-transparent px-1 py-2 text-black focus:outline-none focus:ring-0 dark:bg-transparent dark:text-white"
              style={{
                resize: 'none',
                fontSize: `${fontSize}px`,
                maxHeight: '400px',
                overflow: `${
                  textareaRef.current && textareaRef.current.scrollHeight > 400
                    ? 'auto'
                    : 'hidden'
                }`,
              }}
              placeholder={
                t('Type a message or type "/" to select a prompt...') || ''
              }
              value={content}
              rows={1}
              onCompositionStart={() => setIsTyping(true)}
              onCompositionEnd={() => setIsTyping(false)}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
            />

            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-black text-white transition-opacity hover:opacity-80 disabled:opacity-40 dark:bg-white dark:text-black md:h-9 md:w-9"
              onClick={handleSend}
            >
              {messageIsStreaming ? (
                <div className="h-4 w-4 animate-spin rounded-full border-t-2 border-neutral-800 opacity-60 dark:border-neutral-100"></div>
              ) : (
                <IconSend size={18} />
              )}
            </button>

            {showPluginSelect && (
              <div className="absolute left-0 bottom-full z-20 mb-2 w-56 rounded-lg border border-neutral-200 bg-white shadow-xl dark:border-neutral-600 dark:bg-[#343541]">
                <PluginSelect
                  plugin={plugin}
                  onPluginChange={(nextPlugin: Plugin) => {
                    setPlugin(nextPlugin);
                    setShowPluginSelect(false);

                    if (textareaRef && textareaRef.current) {
                      textareaRef.current.focus();
                    }
                  }}
                />
              </div>
            )}

            {showPromptList && filteredPrompts.length > 0 && (
              <div className="absolute bottom-full z-20 mb-2 w-full">
                <PromptList
                  activePromptIndex={activePromptIndex}
                  prompts={filteredPrompts}
                  onSelect={handleInitModal}
                  onMouseOver={setActivePromptIndex}
                  promptListRef={promptListRef}
                />
              </div>
            )}
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 pt-1.5">
            <button
              className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] text-neutral-500 transition-colors hover:bg-black/5 dark:text-neutral-300 dark:hover:bg-white/10"
              onClick={() => {
                setShowAttachMenu(false);
                setShowModelPicker(!showModelPicker);
              }}
              title={t('Model settings') as string}
            >
              <span className="max-w-[200px] truncate">
                {providerName} · {model.name}
              </span>
              {model.isFree && (
                <span className="rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-green-600 dark:text-green-400">
                  {t('Free')}
                </span>
              )}
              <IconChevronDown size={14} className="shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {isModalVisible && (
        <VariableModal
          prompt={prompts[activePromptIndex]}
          variables={variables}
          onSubmit={handleSubmit}
          onClose={() => setIsModalVisible(false)}
        />
      )}

      {pendingFiles && (
        <ConfirmDialog
          fileCount={pendingFiles.length}
          sizeLabel={formatMB(pendingSizeMb * 1024 * 1024)}
          aboveCap={pendingAboveCap}
          maxMbLabel={formatMB(MAX_TOTAL_BYTES)}
          onAccept={acceptPendingFiles}
          onDecline={declinePendingFiles}
        />
      )}
    </div>
  );
};