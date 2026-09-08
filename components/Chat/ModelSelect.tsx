import { OpenAIModel } from '@/types/openai';
import {
  MODEL_DEFAULT_MAX_LENGTH,
  MODEL_DEFAULT_TOKEN_LIMIT,
} from '@/types/provider';
import { useTranslation } from 'next-i18next';
import { IconExternalLink } from '@tabler/icons-react';
import { FC, KeyboardEvent, useState } from 'react';

interface Props {
  model: OpenAIModel;
  models: OpenAIModel[];
  providerName: string;
  usageUrl?: string;
  onModelChange: (model: OpenAIModel) => void;
}

export const ModelSelect: FC<Props> = ({
  model,
  models,
  providerName,
  usageUrl,
  onModelChange,
}) => {
  const { t } = useTranslation('chat');
  const isCustomModel = !models.some((m) => m.id === model?.id);
  const [showCustom, setShowCustom] = useState<boolean>(isCustomModel);
  const [customId, setCustomId] = useState<string>(isCustomModel ? model?.id : '');

  const handleEnterDown = (
    e: KeyboardEvent<HTMLInputElement>,
    customId: string,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomModelChange(customId);
    }
  };

  const handleCustomModelChange = (value: string) => {
    const id = value.trim();

    if (!id) {
      return;
    }

    onModelChange({
      id,
      name: id,
      maxLength: MODEL_DEFAULT_MAX_LENGTH,
      tokenLimit: MODEL_DEFAULT_TOKEN_LIMIT,
    });
  };

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('Model')} · {providerName}
      </label>
      <div className="w-full rounded-lg border border-neutral-200 bg-transparent pr-2 text-neutral-900 dark:border-neutral-600 dark:text-white">
        <select
          className="w-full bg-transparent p-2 dark:bg-[#343541]"
          placeholder={t('Select a model') || ''}
          value={showCustom ? '__custom__' : model?.id}
          onChange={(e) => {
            if (e.target.value === '__custom__') {
              setShowCustom(true);
              setCustomId(model?.id || '');
            } else {
              setShowCustom(false);
              const selectedModel = models.find(
                (m) => m.id === e.target.value,
              );
              if (selectedModel) {
                onModelChange(selectedModel);
              }
            }
          }}
        >
          {models.map((mod) => (
            <option
              key={mod.id}
              value={mod.id}
              className="dark:bg-[#343541] dark:text-white"
            >
              {mod.name}
            </option>
          ))}
          <option
            value="__custom__"
            className="dark:bg-[#343541] dark:text-white"
          >
            {t('Custom model…')}
          </option>
        </select>
      </div>

      {showCustom && (
        <input
          autoFocus
          className="mt-2 w-full rounded-lg border border-neutral-200 bg-transparent p-2 text-neutral-900 outline-none dark:border-neutral-600 dark:text-white"
          value={customId}
          onChange={(e) => setCustomId(e.target.value)}
          onKeyDown={(e) => handleEnterDown(e, customId)}
          onBlur={() => handleCustomModelChange(customId)}
          placeholder={t('Enter a model id') || ''}
        />
      )}

      {usageUrl && (
        <div className="mt-3 flex w-full items-center text-left text-neutral-700 dark:text-neutral-400">
          <a
            href={usageUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-center"
          >
            <IconExternalLink size={18} className={'mr-1 inline'} />
            {t('View Account Usage')}
          </a>
        </div>
      )}
    </div>
  );
};