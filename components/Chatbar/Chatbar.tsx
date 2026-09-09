import { Conversation } from '@/types/chat';
import { KeyValuePair } from '@/types/data';
import { Folder, FolderType } from '@/types/folder';
import { Prompt } from '@/types/prompt';
import {
  IconFolderPlus,
  IconMessagesOff,
  IconPlus,
  IconSettings,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC, useEffect, useState } from 'react';
import { ChatFolders } from '../Folders/Chat/ChatFolders';
import { PromptFolders } from '../Folders/Prompt/PromptFolders';
import { Search } from '../Sidebar/Search';
import { SidebarButton } from '../Sidebar/SidebarButton';
import { Conversations } from './Conversations';
import { Prompts } from '../Promptbar/Prompts';

interface Props {
  loading: boolean;
  conversations: Conversation[];
  selectedConversation: Conversation;
  folders: Folder[];
  prompts: Prompt[];
  collapsed: boolean;
  mobileOpen: boolean;
  onOpenSettings: () => void;
  onCreateFolder: (name: string, type: FolderType) => void;
  onDeleteFolder: (folderId: string) => void;
  onUpdateFolder: (folderId: string, name: string) => void;
  onNewConversation: () => void;
  onSelectConversation: (conversation: Conversation) => void;
  onDeleteConversation: (conversation: Conversation) => void;
  onUpdateConversation: (
    conversation: Conversation,
    data: KeyValuePair,
  ) => void;
  onCreatePrompt: () => void;
  onUpdatePrompt: (prompt: Prompt) => void;
  onDeletePrompt: (prompt: Prompt) => void;
}

export const Chatbar: FC<Props> = ({
  loading,
  conversations,
  selectedConversation,
  folders,
  prompts,
  collapsed,
  mobileOpen,
  onOpenSettings,
  onCreateFolder,
  onDeleteFolder,
  onUpdateFolder,
  onNewConversation,
  onSelectConversation,
  onDeleteConversation,
  onUpdateConversation,
  onCreatePrompt,
  onUpdatePrompt,
  onDeletePrompt,
}) => {
  const { t } = useTranslation('sidebar');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filteredConversations, setFilteredConversations] =
    useState<Conversation[]>(conversations);
  const [promptSearchTerm, setPromptSearchTerm] = useState<string>('');
  const [filteredPrompts, setFilteredPrompts] = useState<Prompt[]>(prompts);

  const handleUpdateConversation = (
    conversation: Conversation,
    data: KeyValuePair,
  ) => {
    onUpdateConversation(conversation, data);
    setSearchTerm('');
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    onDeleteConversation(conversation);
    setSearchTerm('');
  };

  const handleUpdatePrompt = (prompt: Prompt) => {
    onUpdatePrompt(prompt);
    setPromptSearchTerm('');
  };

  const handleDeletePrompt = (prompt: Prompt) => {
    onDeletePrompt(prompt);
    setPromptSearchTerm('');
  };

  const handleDrop = (e: any) => {
    if (e.dataTransfer) {
      const conversation = JSON.parse(e.dataTransfer.getData('conversation'));
      onUpdateConversation(conversation, { key: 'folderId', value: 0 });

      e.target.style.background = 'none';
    }
  };

  const handlePromptDrop = (e: any) => {
    if (e.dataTransfer) {
      const prompt = JSON.parse(e.dataTransfer.getData('prompt'));

      onUpdatePrompt({
        ...prompt,
        folderId: null,
      });

      e.target.style.background = 'none';
    }
  };

  const allowDrop = (e: any) => {
    e.preventDefault();
  };

  const highlightDrop = (e: any) => {
    e.target.style.background = '#343541';
  };

  const removeHighlight = (e: any) => {
    e.target.style.background = 'none';
  };

  useEffect(() => {
    if (searchTerm) {
      setFilteredConversations(
        conversations.filter((conversation) => {
          const searchable =
            conversation.name.toLocaleLowerCase() +
            ' ' +
            conversation.messages.map((message) => message.content).join(' ');
          return searchable.toLowerCase().includes(searchTerm.toLowerCase());
        }),
      );
    } else {
      setFilteredConversations(conversations);
    }
  }, [searchTerm, conversations]);

  useEffect(() => {
    if (promptSearchTerm) {
      setFilteredPrompts(
        prompts.filter((prompt) => {
          const searchable =
            prompt.name.toLowerCase() +
            ' ' +
            prompt.description.toLowerCase() +
            ' ' +
            prompt.content.toLowerCase();
          return searchable.includes(promptSearchTerm.toLowerCase());
        }),
      );
    } else {
      setFilteredPrompts(prompts);
    }
  }, [promptSearchTerm, prompts]);

  const chatFolders = folders.filter((folder) => folder.type === 'chat');
  const promptFolders = folders.filter((folder) => folder.type === 'prompt');

  if (collapsed) {
    return (
      <div
        className={`fixed top-0 bottom-0 left-0 z-50 flex h-full w-[280px] flex-none flex-col items-center gap-1 bg-[#202123] p-2 transition-all sm:relative sm:top-0 sm:w-[68px] sm:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          className="flex h-10 w-10 flex-shrink-0 cursor-pointer select-none items-center justify-center rounded-md border border-white/20 text-white transition-colors duration-200 hover:bg-gray-500/10"
          title={t('New chat') as string}
          onClick={() => {
            onNewConversation();
            setSearchTerm('');
          }}
        >
          <IconPlus size={20} />
        </button>

        <button
          className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/20 text-white transition-colors duration-200 hover:bg-gray-500/10"
          title={t('New folder') as string}
          onClick={() => onCreateFolder(t('New folder'), 'chat')}
        >
          <IconFolderPlus size={20} />
        </button>

        <div className="mt-auto">
          <button
            className="flex h-10 w-10 cursor-pointer select-none items-center justify-center rounded-md text-neutral-400 transition-colors duration-200 hover:bg-gray-500/10 hover:text-white"
            title={t('Settings') as string}
            onClick={onOpenSettings}
          >
            <IconSettings size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed top-0 bottom-0 left-0 z-50 flex h-full w-[280px] flex-none flex-col space-y-2 bg-[#202123] p-2 transition-all sm:relative sm:top-0 sm:translate-x-0 ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex items-center">
        <button
          className="flex flex-1 flex-shrink-0 cursor-pointer select-none items-center gap-3 rounded-md border border-white/20 p-3 text-[14px] leading-normal text-white transition-colors duration-200 hover:bg-gray-500/10"
          onClick={() => {
            onNewConversation();
            setSearchTerm('');
          }}
        >
          <IconPlus size={18} />
          {t('New chat')}
        </button>

        <button
          className="ml-2 flex h-[42px] w-[42px] flex-shrink-0 cursor-pointer items-center justify-center rounded-md border border-white/20 text-white transition-colors duration-200 hover:bg-gray-500/10"
          title={t('New folder') as string}
          onClick={() => onCreateFolder(t('New folder'), 'chat')}
        >
          <IconFolderPlus size={18} />
        </button>
      </div>

      {conversations.length > 1 && (
        <Search
          placeholder={t('Search conversations...') as string}
          searchTerm={searchTerm}
          onSearch={setSearchTerm}
        />
      )}

      <div className="flex-grow overflow-auto">
        {chatFolders.length > 0 && (
          <div className="flex border-b border-white/20 pb-2">
            <ChatFolders
              searchTerm={searchTerm}
              conversations={filteredConversations.filter(
                (conversation) => conversation.folderId,
              )}
              folders={chatFolders}
              onDeleteFolder={onDeleteFolder}
              onUpdateFolder={onUpdateFolder}
              selectedConversation={selectedConversation}
              loading={loading}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateConversation={handleUpdateConversation}
            />
          </div>
        )}

        {conversations.length > 0 ? (
          <div
            className="pt-2"
            onDrop={(e) => handleDrop(e)}
            onDragOver={allowDrop}
            onDragEnter={highlightDrop}
            onDragLeave={removeHighlight}
          >
            <Conversations
              loading={loading}
              conversations={filteredConversations.filter(
                (conversation) => !conversation.folderId,
              )}
              selectedConversation={selectedConversation}
              onSelectConversation={onSelectConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateConversation={handleUpdateConversation}
            />
          </div>
        ) : (
          <div className="mt-8 flex flex-col items-center gap-3 text-sm leading-normal text-white opacity-50">
            <IconMessagesOff />
            {t('No conversations.')}
          </div>
        )}

        <div className="mt-4 border-t border-white/20 pt-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
              {t('Prompts')}
            </span>
            <div className="flex items-center gap-1">
              <button
                className="flex h-7 w-7 cursor-pointer select-none items-center justify-center rounded-md text-neutral-400 transition-colors duration-200 hover:bg-gray-500/10 hover:text-white"
                title={t('New prompt') as string}
                onClick={() => {
                  onCreatePrompt();
                  setPromptSearchTerm('');
                }}
              >
                <IconPlus size={16} />
              </button>
              <button
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-neutral-400 transition-colors duration-200 hover:bg-gray-500/10 hover:text-white"
                title={t('New prompt folder') as string}
                onClick={() => onCreateFolder(t('New folder'), 'prompt')}
              >
                <IconFolderPlus size={16} />
              </button>
            </div>
          </div>

          {prompts.length > 1 && (
            <div className="py-2">
              <Search
                placeholder={t('Search prompts...') as string}
                searchTerm={promptSearchTerm}
                onSearch={setPromptSearchTerm}
              />
            </div>
          )}

          {promptFolders.length > 0 && (
            <div className="flex py-1">
              <PromptFolders
                searchTerm={promptSearchTerm}
                prompts={filteredPrompts}
                folders={promptFolders}
                onUpdateFolder={onUpdateFolder}
                onDeleteFolder={onDeleteFolder}
                onDeletePrompt={handleDeletePrompt}
                onUpdatePrompt={handleUpdatePrompt}
              />
            </div>
          )}

          {prompts.length > 0 ? (
            <div
              className="pt-1"
              onDrop={(e) => handlePromptDrop(e)}
              onDragOver={allowDrop}
              onDragEnter={highlightDrop}
              onDragLeave={removeHighlight}
            >
              <Prompts
                prompts={filteredPrompts.filter((prompt) => !prompt.folderId)}
                onUpdatePrompt={handleUpdatePrompt}
                onDeletePrompt={handleDeletePrompt}
              />
            </div>
          ) : (
            <div className="mt-2 flex flex-col items-center gap-2 text-sm leading-normal text-white opacity-50">
              <span>{t('No prompts.')}</span>
            </div>
          )}
        </div>
      </div>

      <div className="pt-1">
        <SidebarButton
          text={t('Settings')}
          icon={<IconSettings size={18} />}
          onClick={onOpenSettings}
        />
      </div>
    </div>
  );
};