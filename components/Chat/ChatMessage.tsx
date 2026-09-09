import { Message } from '@/types/chat';
import { rehypeEmoji, toEmojiHtml } from '@/utils/app/emoji';
import {
  IconCheck,
  IconCopy,
  IconEdit,
  IconFile,
  IconFileText,
  IconReload,
  IconRobot,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC, memo, useEffect, useRef, useState } from 'react';
import rehypeMathjax from 'rehype-mathjax';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import { CodeBlock } from '../Markdown/CodeBlock';
import { MemoizedReactMarkdown } from '../Markdown/MemoizedReactMarkdown';

interface Props {
  message: Message;
  messageIndex: number;
  fontSize: number;
  onEditMessage: (message: Message, messageIndex: number) => void;
  onRegenerate?: () => void;
}

export const ChatMessage: FC<Props> = memo(
  ({ message, messageIndex, fontSize, onEditMessage, onRegenerate }) => {
    const { t } = useTranslation('chat');
    const [isEditing, setIsEditing] = useState<boolean>(false);
    const [isTyping, setIsTyping] = useState<boolean>(false);
    const [messageContent, setMessageContent] = useState(message.content);
    const [messagedCopied, setMessageCopied] = useState(false);
    const [lightboxUrl, setLightboxUrl] = useState<string>();

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const toggleEditing = () => {
      setIsEditing(!isEditing);
    };

    const handleInputChange = (
      event: React.ChangeEvent<HTMLTextAreaElement>,
    ) => {
      setMessageContent(event.target.value);
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    };

    const handleEditMessage = () => {
      if (message.content != messageContent) {
        onEditMessage({ ...message, content: messageContent }, messageIndex);
      }
      setIsEditing(false);
    };

    const handlePressEnter = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !isTyping && !e.shiftKey) {
        e.preventDefault();
        handleEditMessage();
      }
    };

    const copyOnClick = () => {
      if (!navigator.clipboard) return;

      navigator.clipboard.writeText(message.content).then(() => {
        setMessageCopied(true);
        setTimeout(() => {
          setMessageCopied(false);
        }, 2000);
      });
    };

    useEffect(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = 'inherit';
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
      }
    }, [isEditing]);

    useEffect(() => {
      if (!lightboxUrl) return;

      const handleKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          setLightboxUrl(undefined);
        }
      };

      window.addEventListener('keydown', handleKey);

      return () => {
        window.removeEventListener('keydown', handleKey);
      };
    }, [lightboxUrl]);

    return (
      <div
        className={`group px-4 ${
          message.role === 'assistant'
            ? 'border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100'
            : 'border-b border-black/10 bg-white text-gray-800 dark:border-gray-900/50 dark:bg-[#343541] dark:text-gray-100'
        }`}
        style={{ overflowWrap: 'anywhere' }}
      >
        <div className="relative m-auto flex gap-4 p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-3xl lg:px-0">
          {message.role === 'assistant' ? (
            <div className="min-w-[40px] text-right font-bold">
              <IconRobot size={30} />
            </div>
          ) : null}

          <div className="w-full">
            {message.role === 'user' ? (
              <div className="flex w-full flex-col">
                {isEditing ? (
                  <div className="flex w-full flex-col">
                    <textarea
                      ref={textareaRef}
                      className="w-full resize-none whitespace-pre-wrap border-none dark:bg-[#343541]"
                      value={messageContent}
                      onChange={handleInputChange}
                      onKeyDown={handlePressEnter}
                      onCompositionStart={() => setIsTyping(true)}
                      onCompositionEnd={() => setIsTyping(false)}
                      style={{
                        fontFamily: 'inherit',
                        fontSize: 'inherit',
                        lineHeight: 'inherit',
                        padding: '0',
                        margin: '0',
                        overflow: 'hidden',
                      }}
                    />

                    <div className="mt-4 flex justify-end space-x-4">
                      <button
                        className="h-[40px] rounded-md bg-blue-500 px-4 py-1 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
                        onClick={handleEditMessage}
                        disabled={messageContent.trim().length <= 0}
                      >
                        {t('Save & Submit')}
                      </button>
                      <button
                        className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
                        onClick={() => {
                          setMessageContent(message.content);
                          setIsEditing(false);
                        }}
                      >
                        {t('Cancel')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex w-full justify-end">
                      <div className="relative max-w-[85%] rounded-[22px] bg-[#ececec] px-4 py-2.5 text-[#0d0d0d] whitespace-pre-wrap">
                        {message.attachments &&
                          message.attachments.length > 0 && (
                            <div className="mb-2 flex flex-wrap items-center gap-1.5">
                              {message.attachments.map((attachment, index) =>
                                attachment.type === 'image' &&
                                attachment.dataUrl ? (
                                  <button
                                    key={index}
                                    className="overflow-hidden rounded-lg transition-opacity hover:opacity-80"
                                    onClick={() =>
                                      setLightboxUrl(attachment.dataUrl)
                                    }
                                    title={attachment.fileName}
                                  >
                                    <img
                                      src={attachment.dataUrl}
                                      alt={attachment.fileName}
                                      className="h-16 w-16 bg-white/40 object-cover"
                                    />
                                  </button>
                                ) : (
                                  <div
                                    key={index}
                                    className="flex items-center gap-1.5 rounded-md bg-black/5 px-2 py-1 text-xs dark:bg-black/20"
                                  >
                                    {attachment.extracted ? (
                                      <IconFileText
                                        size={13}
                                        className="shrink-0"
                                      />
                                    ) : (
                                      <IconFile
                                        size={13}
                                        className="shrink-0"
                                      />
                                    )}
                                    <span className="max-w-[180px] truncate">
                                      {attachment.fileName}
                                    </span>
                                  </div>
                                ),
                              )}
                            </div>
                          )}

                        <div
                          className="prose dark:prose-invert"
                          style={{ fontSize }}
                          dangerouslySetInnerHTML={{
                            __html: toEmojiHtml(message.content),
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex w-full justify-end">
                      <button
                        className="mt-1 translate-x-[1000px] rounded-md p-1 text-gray-500 hover:text-gray-700 focus:translate-x-0 group-hover:translate-x-0 max-sm:translate-x-0 dark:text-gray-400 dark:hover:text-gray-300"
                        onClick={toggleEditing}
                        title={t('Edit message') as string}
                      >
                        <IconEdit size={18} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="w-full">
                <div
                  className="prose dark:prose-invert"
                  style={{ fontSize }}
                >
                  <MemoizedReactMarkdown
                    remarkPlugins={[remarkGfm, remarkMath]}
                    rehypePlugins={[rehypeMathjax, rehypeEmoji]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');

                        return !inline && match ? (
                          <CodeBlock
                            key={Math.random()}
                            language={match[1]}
                            value={String(children).replace(/\n$/, '')}
                            {...props}
                          />
                        ) : (
                          <code className={className} {...props}>
                            {children}
                          </code>
                        );
                      },
                      table({ children }) {
                        return (
                          <table className="border-collapse border border-black py-1 px-3 dark:border-white">
                            {children}
                          </table>
                        );
                      },
                      th({ children }) {
                        return (
                          <th className="break-words border border-black bg-gray-500 py-1 px-3 text-white dark:border-white">
                            {children}
                          </th>
                        );
                      },
                      td({ children }) {
                        return (
                          <td className="break-words border border-black py-1 px-3 dark:border-white">
                            {children}
                          </td>
                        );
                      },
                    }}
                  >
                    {message.content}
                  </MemoizedReactMarkdown>
                </div>

                <div className="mt-2 flex items-center gap-0.5 text-neutral-500">
                  <button
                    className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10"
                    onClick={copyOnClick}
                    title={t('Copy') as string}
                  >
                    {messagedCopied ? (
                      <IconCheck
                        size={18}
                        className="text-green-500 dark:text-green-400"
                      />
                    ) : (
                      <IconCopy size={18} />
                    )}
                  </button>

                  {onRegenerate && (
                    <button
                      className="rounded-md p-1.5 transition-colors hover:bg-black/5 dark:text-neutral-400 dark:hover:bg-white/10"
                      onClick={onRegenerate}
                      title={t('Regenerate') as string}
                    >
                      <IconReload size={18} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {lightboxUrl && (
          <div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-6"
            onClick={() => setLightboxUrl(undefined)}
          >
            <img
              src={lightboxUrl}
              alt="Attachment"
              className="max-h-[85vh] max-w-[90vw] rounded-lg"
            />
            <button
              className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
              onClick={() => setLightboxUrl(undefined)}
              title={t('Close') as string}
            >
              <IconX size={20} />
            </button>
          </div>
        )}
      </div>
    );
  },
);
ChatMessage.displayName = 'ChatMessage';