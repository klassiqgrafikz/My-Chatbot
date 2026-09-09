import { Conversation } from '@/types/chat';
import { IconPlus, IconSettings } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {
  selectedConversation: Conversation;
  onNewConversation: () => void;
  onOpenSettings: () => void;
}

export const Navbar: FC<Props> = ({
  selectedConversation,
  onNewConversation,
  onOpenSettings,
}) => {
  return (
    <nav className="flex w-full justify-between bg-[#202123] py-3 px-4">
      <IconSettings
        className="cursor-pointer text-neutral-300 hover:text-white"
        onClick={onOpenSettings}
      />

      <div className="max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap text-neutral-100">
        {selectedConversation.name}
      </div>

      <IconPlus
        className="cursor-pointer text-neutral-300 hover:text-white"
        onClick={onNewConversation}
      />
    </nav>
  );
};