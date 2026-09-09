import { IconRobot } from '@tabler/icons-react';
import { FC } from 'react';

interface Props {}

export const ChatLoader: FC<Props> = () => {
  return (
    <div
      className="group border-b border-black/10 bg-gray-50 text-gray-800 dark:border-gray-900/50 dark:bg-[#444654] dark:text-gray-100"
      style={{ overflowWrap: 'anywhere' }}
    >
      <div className="m-auto flex gap-4 p-4 text-base md:max-w-2xl md:gap-6 md:py-6 lg:max-w-3xl lg:px-0">
        <div className="min-w-[40px] text-right font-bold">
          <IconRobot size={30} />
        </div>

        <div className="w-full">
          <div className="flex items-center gap-1.5 text-neutral-500 dark:text-neutral-300">
            <span>replying</span>
            <span className="animate-pulse" style={{ animationDelay: '0ms' }}>
              .
            </span>
            <span
              className="animate-pulse"
              style={{ animationDelay: '150ms' }}
            >
              .
            </span>
            <span
              className="animate-pulse"
              style={{ animationDelay: '300ms' }}
            >
              .
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};