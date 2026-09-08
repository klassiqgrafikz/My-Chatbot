import { OpenAIModel } from '@/types/openai';
import {
  MODEL_DEFAULT_MAX_LENGTH,
  MODEL_DEFAULT_TOKEN_LIMIT,
} from '@/types/provider';
import { useTranslation } from 'next-i18next';
import {
  IconCheck,
  IconChevronDown,
  IconExternalLink,
  IconSearch,
} from '@tabler/icons-react';
import { FC, KeyboardEvent, useMemo, useRef, useState } from 'react';

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
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [freeOnly, setFreeOnly] = useState<boolean>(false);
  const [highlightIndex, setHighlightIndex] = useState<number>(0);
  const [showCustom, setShowCustom] = useState<boolean>(isCustomModel);
  const [customId, setCustomId] = useState<string>(isCustomModel ? model?.id : '');
  const searchRef = useRef<HTMLInputElement>(null);

  const hasFreeModels = models.some((m) => m.isFree);

  const filteredModels = useMemo(() => {
    const term = search.trim().toLowerCase();

    return models.filter((m) => {
      if (freeOnly && !m.isFree) {
        return false;
      }

      if (!term) {
        return true;
      }

      return (
        m.id.toLowerCase().includes(term) ||
        m.name.toLowerCase().includes(term)
      );
    });
  }, [models, search, freeOnly]);

  const selectModel = (selected: OpenAIModel) => {
    onModelChange(selected);
    setIsOpen(false);
    setSearch('');
    setHighlightIndex(0);
  };

  const selectCustom = () => {
    setIsOpen(false);
    setShowCustom(true);
    setCustomId(model?.id || '');
  };

  const handleEnterDown = (
    e: KeyboardEvent<HTMLInputElement>,
    value: string,
  ) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCustomModelChange(value);
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

  const handleDropdownKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex((i) =>
        Math.min(filteredModels.length - 1, i + 1),
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const selected = filteredModels[highlightIndex];
      if (selected) {
        selectModel(selected);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      setSearch('');
    }
  };

  const openDropdown = () => {
    setSearch('');
    setHighlightIndex(0);
    setIsOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const FreeBadge = () => (
    <span className="ml-auto shrink-0 rounded bg-green-500/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none text-green-600 dark:text-green-400">
      {t('Free')}
    </span>
  );

  return (
    <div className="flex flex-col">
      <label className="mb-2 text-left text-neutral-700 dark:text-neutral-400">
        {t('Model')} · {providerName}
      </label>

      <div
        className="relative w-full"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsOpen(false);
            setSearch('');
          }
        }}
      >
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-lg border border-neutral-200 bg-transparent p-2 text-left text-neutral-900 focus:outline-none dark:border-neutral-600 dark:text-white"
          onClick={() => (isOpen ? setIsOpen(false) : openDropdown())}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span className="flex min-w-0 items-center gap-2">
            <span className="overflow-hidden overflow-ellipsis">
              {model?.name || t('Select a model')}
            </span>
            {model?.isFree && <FreeBadge />}
          </span>
          <IconChevronDown
            size={16}
            className="shrink-0 text-neutral-400"
          />
        </button>

        {isOpen && (
          <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-600 dark:bg-[#343541]">
            <div className="flex items-center gap-2 border-b border-neutral-200 px-2 dark:border-neutral-600">
              <IconSearch size={16} className="shrink-0 text-neutral-400" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setHighlightIndex(0);
                }}
                onKeyDown={handleDropdownKeyDown}
                placeholder={t('Search models…') || ''}
                className="h-[36px] w-full bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400 dark:text-white"
              />
            </div>

            {hasFreeModels && (
              <label className="flex cursor-pointer select-none items-center gap-2 border-b border-neutral-200 px-3 py-1.5 text-xs text-neutral-600 dark:border-neutral-600 dark:text-neutral-300">
                <input
                  type="checkbox"
                  checked={freeOnly}
                  onChange={(e) => {
                    setFreeOnly(e.target.checked);
                    setHighlightIndex(0);
                  }}
                />
                {t('Only show free models')}
              </label>
            )}

            <ul
              role="listbox"
              className="max-h-64 overflow-y-auto"
              onMouseDown={(e) => e.preventDefault()}
            >
              {filteredModels.map((m, index) => {
                const selected = m.id === model?.id;
                const highlighted = index === highlightIndex;

                return (
                  <li
                    key={m.id}
                    role="option"
                    aria-selected={selected}
                    className={`flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-neutral-900 dark:text-white ${
                      highlighted
                        ? 'bg-neutral-200/70 dark:bg-neutral-600/50'
                        : ''
                    } ${selected ? 'font-semibold' : ''}`}
                    onMouseEnter={() => setHighlightIndex(index)}
                    onClick={() => selectModel(m)}
                  >
                    <span className="min-w-0 overflow-hidden overflow-ellipsis">
                      {m.name}
                    </span>
                    {m.isFree && <FreeBadge />}
                    {selected && (
                      <IconCheck size={16} className="ml-auto shrink-0 text-green-600 dark:text-green-400" />
                    )}
                  </li>
                );
              })}

              {filteredModels.length === 0 && (
                <li className="px-3 py-2 text-sm text-neutral-500 dark:text-neutral-400">
                  {t('No models found.')}
                </li>
              )}

              <li
                role="option"
                className="flex cursor-pointer items-center gap-2 border-t border-neutral-200 px-3 py-2 text-sm text-blue-600 hover:bg-neutral-200/70 dark:border-neutral-600 dark:text-blue-400 dark:hover:bg-neutral-600/50"
                onClick={selectCustom}
              >
                {t('Custom model…')}
              </li>
            </ul>
          </div>
        )}
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