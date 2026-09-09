import { useTranslation } from 'next-i18next';
import { FC, useEffect } from 'react';

interface Props {
  fileCount: number;
  sizeLabel: string;
  aboveCap: boolean;
  maxMbLabel: string;
  onAccept: () => void;
  onDecline: () => void;
}

export const ConfirmDialog: FC<Props> = ({
  fileCount,
  sizeLabel,
  aboveCap,
  maxMbLabel,
  onAccept,
  onDecline,
}) => {
  const { t } = useTranslation('chat');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDecline();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onDecline]);

  return (
    <div
      className="z-100 fixed inset-0 flex items-center justify-center bg-black/60 p-4"
      onClick={onDecline}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl dark:border-neutral-600 dark:bg-[#2a2b32]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-lg font-semibold text-neutral-900 dark:text-white">
          {t('Attach files?')}
        </div>

        <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
          {t('You are about to add {{count}} file(s) totaling {{size}} to your message.', {
            count: fileCount,
            size: sizeLabel,
          })}
        </div>

        {aboveCap && (
          <div className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">
            {t('This exceeds the {{max}} limit.', { max: maxMbLabel })}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-3">
          <button
            className="h-[40px] rounded-md border border-neutral-300 px-4 py-1 text-sm font-medium text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            onClick={onDecline}
          >
            {t('Decline')}
          </button>
          <button
            className="h-[40px] rounded-md bg-black px-4 py-1 text-sm font-medium text-white hover:opacity-80 dark:bg-white dark:text-black"
            onClick={onAccept}
          >
            {t('Accept')}
          </button>
        </div>
      </div>
    </div>
  );
};