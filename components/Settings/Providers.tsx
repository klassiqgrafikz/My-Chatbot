import { AIProvider } from '@/types/provider';
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconPlus,
  IconTrash,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC, KeyboardEvent, useEffect, useState } from 'react';
import { SidebarButton } from '../Sidebar/SidebarButton';

interface Props {
  providers: AIProvider[];
  selectedProviderId: string;
  loadingProviderId: string | null;
  loadErrorProviderId: string | null;
  loadError: string | null;
  onUpdateProvider: (provider: AIProvider) => void;
  onSelectProvider: (providerId: string) => void;
  onRemoveProvider: (providerId: string) => void;
  onAddProvider: (name: string, apiHost: string, apiKey: string) => void;
}

export const Providers: FC<Props> = ({
  providers,
  selectedProviderId,
  loadingProviderId,
  loadErrorProviderId,
  loadError,
  onUpdateProvider,
  onSelectProvider,
  onRemoveProvider,
  onAddProvider,
}) => {
  const { t } = useTranslation('sidebar');
  const [expandedProviderId, setExpandedProviderId] = useState<string | null>(
    null,
  );
  const [draft, setDraft] = useState<AIProvider | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addName, setAddName] = useState('');
  const [addHost, setAddHost] = useState('https://');
  const [addKey, setAddKey] = useState('');

  useEffect(() => {
    if (expandedProviderId) {
      const provider = providers.find((p) => p.id === expandedProviderId);
      if (provider) {
        setDraft({ ...provider });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandedProviderId]);

  const handleEnterDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
    }
  };

  const handleAddProvider = () => {
    const name = addName.trim();
    const apiHost = addHost.trim();

    if (!name || !apiHost) {
      return;
    }

    onAddProvider(name, apiHost, addKey.trim());
    setAddName('');
    setAddHost('https://');
    setAddKey('');
    setShowAdd(false);
  };

  return (
    <div className="flex w-full flex-col">
      <SidebarButton
        text={t('AI Providers') || 'AI Providers'}
        icon={<IconChevronDown size={18} />}
        onClick={() =>
          setExpandedProviderId(expandedProviderId ? null : providers[0]?.id || null)
        }
      />

      {expandedProviderId && (
        <div className="flex w-full flex-col gap-1 border-l border-white/10 py-1">
          {providers.map((provider) => {
            const expanded = expandedProviderId === provider.id;
            const selected = provider.id === selectedProviderId;
            const loading = loadingProviderId === provider.id;

            return (
              <div
                key={provider.id}
                className={`flex flex-col overflow-hidden rounded-md border ${
                  selected ? 'border-white/30' : 'border-white/10'
                }`}
              >
                <div className="flex w-full items-center gap-2 px-3 py-2">
                  <button
                    className="flex flex-1 cursor-pointer select-none items-center gap-2 text-left text-[13px] leading-tight text-white hover:opacity-80"
                    onClick={() =>
                      setExpandedProviderId(expanded ? null : provider.id)
                    }
                  >
                    {expanded ? (
                      <IconChevronDown size={16} className="shrink-0 text-neutral-400" />
                    ) : (
                      <IconChevronRight size={16} className="shrink-0 text-neutral-400" />
                    )}
                    {selected && (
                      <IconCheck size={16} className="shrink-0 text-green-500" />
                    )}
                    <span className="overflow-hidden overflow-ellipsis">
                      {provider.name}
                    </span>
                    {!provider.apiKey && provider.models.length === 0 && (
                      <span className="ml-auto text-[10px] text-neutral-500">
                        {t('no key')}
                      </span>
                    )}
                  </button>
                  <button
                    className="shrink-0 rounded border border-white/20 px-2 py-0.5 text-[11px] text-white hover:bg-gray-500/10"
                    onClick={() => onSelectProvider(provider.id)}
                  >
                    {t('Use')}
                  </button>
                </div>

                {expanded && draft && draft.id === provider.id && (
                  <div className="flex flex-col gap-2 px-3 pb-3 pt-1">
                    {draft.isCustom && (
                      <input
                        className="h-[24px] w-full flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
                        value={draft.name}
                        onChange={(e) =>
                          setDraft({ ...draft, name: e.target.value })
                        }
                        placeholder={t('Name') || 'Name'}
                      />
                    )}

                    <input
                      className="h-[24px] w-full flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
                      type="password"
                      value={draft.apiKey}
                      onChange={(e) =>
                        setDraft({ ...draft, apiKey: e.target.value })
                      }
                      onKeyDown={handleEnterDown}
                      placeholder={t('API key') || 'API key'}
                    />

                    <input
                      className="h-[24px] w-full flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
                      type="text"
                      value={draft.apiHost}
                      onChange={(e) =>
                        setDraft({ ...draft, apiHost: e.target.value })
                      }
                      placeholder={t('Base URL') || 'Base URL'}
                    />

                    {loading ? (
                      <span className="text-[11px] text-neutral-400">
                        {t('Loading models…')}
                      </span>
                    ) : loadErrorProviderId === provider.id && loadError ? (
                      <span className="text-[11px] text-red-400">{loadError}</span>
                    ) : provider.models.length > 0 ? (
                      <span className="text-[11px] text-neutral-400">
                        {`${provider.models.length} ${t('models')}`}
                      </span>
                    ) : null}

                    <div className="flex items-center gap-2">
                      <button
                        className="flex-1 rounded border border-white/20 px-2 py-1 text-[11px] text-white hover:bg-gray-500/10"
                        onClick={() =>
                          onUpdateProvider({
                            ...draft,
                            name: draft.isCustom
                              ? draft.name.trim() || provider.name
                              : draft.name,
                          })
                        }
                      >
                        {t('Save and Connect')}
                      </button>
                      {draft.isCustom && (
                        <button
                          className="shrink-0 rounded border border-white/20 px-2 py-1 text-[11px] text-white hover:bg-gray-500/10"
                          onClick={() => onRemoveProvider(provider.id)}
                        >
                          <IconTrash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {showAdd ? (
            <div className="flex flex-col gap-2 px-3 py-2">
              <input
                autoFocus
                className="h-[24px] w-full flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                placeholder={t('Provider name') || 'Provider name'}
              />
              <input
                className="h-[24px] w-full flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
                value={addHost}
                onChange={(e) => setAddHost(e.target.value)}
                placeholder={t('Base URL (e.g. https://host/v1)') || ''}
              />
              <input
                className="h-[24px] w-full flex-1 overflow-hidden overflow-ellipsis border-b border-neutral-400 bg-transparent pr-1 text-[12.5px] leading-3 text-left text-white outline-none focus:border-neutral-100"
                type="password"
                value={addKey}
                onChange={(e) => setAddKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddProvider();
                  }
                }}
                placeholder={t('API key') || 'API key'}
              />
              <button
                className="rounded border border-white/20 px-2 py-1 text-[11px] text-white hover:bg-gray-500/10"
                onClick={handleAddProvider}
              >
                {t('Add provider')}
              </button>
            </div>
          ) : (
            <button
              className="flex w-full cursor-pointer select-none items-center gap-2 px-3 py-2 text-left text-[13px] leading-tight text-neutral-400 hover:text-white"
              onClick={() => setShowAdd(true)}
            >
              <IconPlus size={16} />
              {t('Add provider')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};