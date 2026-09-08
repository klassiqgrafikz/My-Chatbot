import { SupportedExportFormats } from '@/types/export';
import { PluginKey } from '@/types/plugin';
import { AIProvider } from '@/types/provider';
import { IconFileExport, IconMoon, IconSun } from '@tabler/icons-react';
import { useTranslation } from 'next-i18next';
import { FC } from 'react';
import { Import } from '../Settings/Import';
import { Providers } from '../Settings/Providers';
import { SidebarButton } from '../Sidebar/SidebarButton';
import { ClearConversations } from './ClearConversations';
import { PluginKeys } from './PluginKeys';

interface Props {
  lightMode: 'light' | 'dark';
  providers: AIProvider[];
  selectedProviderId: string;
  loadingProviderId: string | null;
  loadErrorProviderId: string | null;
  loadError: string | null;
  pluginKeys: PluginKey[];
  conversationsCount: number;
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

export const ChatbarSettings: FC<Props> = ({
  lightMode,
  providers,
  selectedProviderId,
  loadingProviderId,
  loadErrorProviderId,
  loadError,
  pluginKeys,
  conversationsCount,
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

  return (
    <div className="flex flex-col items-center space-y-1 border-t border-white/20 pt-1 text-sm">
      {conversationsCount > 0 ? (
        <ClearConversations onClearConversations={onClearConversations} />
      ) : null}

      <Import onImport={onImportConversations} />

      <SidebarButton
        text={t('Export data')}
        icon={<IconFileExport size={18} />}
        onClick={() => onExportConversations()}
      />

      <SidebarButton
        text={lightMode === 'light' ? t('Dark mode') : t('Light mode')}
        icon={
          lightMode === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />
        }
        onClick={() =>
          onToggleLightMode(lightMode === 'light' ? 'dark' : 'light')
        }
      />

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

      <PluginKeys
        pluginKeys={pluginKeys}
        onPluginKeyChange={onPluginKeyChange}
        onClearPluginKey={onClearPluginKey}
      />
    </div>
  );
};