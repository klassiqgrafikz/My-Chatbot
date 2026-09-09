import { SupportedExportFormats } from '@/types/export';
import { PluginKey } from '@/types/plugin';
import { AIProvider } from '@/types/provider';
import {
  IconFileExport,
  IconMoon,
  IconSun,
  IconX,
} from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC, useEffect } from 'react';
import { SidebarButton } from '../Sidebar/SidebarButton';
import { ClearConversations } from '../Chatbar/ClearConversations';
import { Import } from './Import';
import { PluginKeysSection } from './PluginKeysSection';
import { Providers } from './Providers';

interface Props {
  open: boolean;
  lightMode: 'light' | 'dark';
  providers: AIProvider[];
  selectedProviderId: string;
  loadingProviderId: string | null;
  loadErrorProviderId: string | null;
  loadError: string | null;
  pluginKeys: PluginKey[];
  conversationsCount: number;
  onClose: () => void;
  onToggleLightMode: (mode: 'light' | 'dark') => void;
  onUpdateProvider: (provider: AIProvider) => void;
  onSelectProvider: (providerId: string) => void;
  onAddProvider: (name: string, apiHost: string, apiKey: string) => void;
  onRemoveProvider: (providerId: string) => void;
  onClearConversations: () => void;
  onExportConversations: () => void;
  onImportConversations: (data: SupportedExportFormats) => void;
  onPluginKeyChange: (pluginKey: PluginKey) => void;
  onClearPluginKey: (pluginKey: PluginKey) => void;
}

const Panel = ({ title, children }: { title: string; children: any }) => (
  <section className="border-b border-white/10 px-5 py-5">
    <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-400">
      {title}
    </h2>
    {children}
  </section>
);

export const SettingsDrawer: FC<Props> = ({
  open,
  lightMode,
  providers,
  selectedProviderId,
  loadingProviderId,
  loadErrorProviderId,
  loadError,
  pluginKeys,
  conversationsCount,
  onClose,
  onToggleLightMode,
  onUpdateProvider,
  onSelectProvider,
  onAddProvider,
  onRemoveProvider,
  onClearConversations,
  onExportConversations,
  onImportConversations,
  onPluginKeyChange,
  onClearPluginKey,
}) => {
  const { t } = useTranslation('sidebar');

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  if (!open) {
    return null;
  }

  const lightModeActive = lightMode === 'light';

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/60"
      onClick={onClose}
    >
      <div
        className="flex h-full w-[380px] max-w-[92vw] flex-col bg-[#202123] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div className="text-lg font-semibold">{t('Settings')}</div>
          <button
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-gray-500/10 hover:text-white"
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <Panel title={t('Appearance')}>
            <div className="grid grid-cols-2 gap-2">
              <button
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  lightModeActive
                    ? 'border-white/40 bg-gray-500/10 text-white'
                    : 'border-white/10 text-neutral-400 hover:bg-gray-500/10'
                }`}
                onClick={() => onToggleLightMode('light')}
              >
                <IconSun size={16} /> {t('Light')}
              </button>
              <button
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                  !lightModeActive
                    ? 'border-white/40 bg-gray-500/10 text-white'
                    : 'border-white/10 text-neutral-400 hover:bg-gray-500/10'
                }`}
                onClick={() => onToggleLightMode('dark')}
              >
                <IconMoon size={16} /> {t('Dark')}
              </button>
            </div>
          </Panel>

          <Panel title={t('AI Providers')}>
            <Providers
              providers={providers}
              selectedProviderId={selectedProviderId}
              loadingProviderId={loadingProviderId}
              loadErrorProviderId={loadErrorProviderId}
              loadError={loadError}
              onUpdateProvider={onUpdateProvider}
              onSelectProvider={onSelectProvider}
              onAddProvider={onAddProvider}
              onRemoveProvider={onRemoveProvider}
            />
          </Panel>

          <Panel title={t('Plugin Keys')}>
            <PluginKeysSection
              pluginKeys={pluginKeys}
              onPluginKeyChange={onPluginKeyChange}
              onClearPluginKey={onClearPluginKey}
            />
          </Panel>

          <Panel title={t('Data')}>
            <div className="flex flex-col items-center space-y-1">
              {conversationsCount > 0 && (
                <ClearConversations onClearConversations={onClearConversations} />
              )}
              <Import onImport={onImportConversations} />
              <SidebarButton
                text={t('Export data')}
                icon={<IconFileExport size={18} />}
                onClick={() => onExportConversations()}
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};