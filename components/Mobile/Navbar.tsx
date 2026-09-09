import { Conversation } from '@/types/chat';
import { IconMenu2, IconPlus, IconSettings } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {
  selectedConversation: Conversation;
  onNewConversation: () => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
}

export const Navbar: FC<Props> = ({
  selectedConversation,
  onNewConversation,
  onOpenSettings,
  onToggleSidebar,
}) => {
  return (
    <nav className="flex w-full items-center justify-between gap-2 bg-[#202123] px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
      <button
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
      >
        <IconMenu2 size={22} />
      </button>

      <div className="min-w-0 flex-1 truncate text-center text-[15px] font-medium text-neutral-100">
        {selectedConversation.name}
      </div>

      <button
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onNewConversation}
        aria-label="New chat"
      >
        <IconPlus size={22} />
      </button>

      <button
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md text-neutral-300 transition-colors hover:bg-white/10 hover:text-white"
        onClick={onOpenSettings}
        aria-label="Settings"
      >
        <IconSettings size={22} />
      </button>
    </nav>
  );
};