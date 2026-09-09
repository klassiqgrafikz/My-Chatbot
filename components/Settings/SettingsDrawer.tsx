import { SupportedExportFormats } from '@/types/export';
import { PluginKey } from '@/types/plugin';
import { AIProvider } from '@/types/provider';
import {
  IconArrowBigDown,
  IconArrowBigUp,
  IconFileExport,
  IconLetterA,
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
  fontSize: number;
  onClose: () => void;
  onToggleLightMode: (mode: 'light' | 'dark') => void;
  onFontSizeChange: (delta: number) => void;
  onFontSizeSet: (px: number) => void;
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

const FONT_MIN = 14;
const FONT_MAX = 22;

const Panel = ({ title, children }: { title: string; children: any }) => (
  <section className="border-b border-white/10 px-6 py-5">
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
  fontSize,
  onClose,
  onToggleLightMode,
  onFontSizeChange,
  onFontSizeSet,
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
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="mx-4 flex max-h-[85vh] w-[600px] max-w-full flex-col overflow-hidden rounded-2xl bg-[#202123] text-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Settings"
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="text-lg font-semibold">{t('Settings')}</div>
          <button
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-gray-500/10 hover:text-white"
            onClick={onClose}
          >
            <IconX size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom)]">
          <Panel title={t('Appearance')}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-neutral-300">
                {lightModeActive ? (
                  <IconSun size={16} className="text-neutral-400" />
                ) : (
                  <IconMoon size={16} className="text-neutral-400" />
                )}
                {t('Dark mode')}
              </div>
              <button
                role="switch"
                aria-checked={!lightModeActive}
                onClick={() =>
                  onToggleLightMode(lightModeActive ? 'dark' : 'light')
                }
                className={`relative h-[26px] w-[46px] rounded-full transition-colors ${
                  !lightModeActive ? 'bg-white/90' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-[3px] left-[3px] h-[20px] w-[20px] rounded-full shadow transition-transform ${
                    !lightModeActive
                      ? 'translate-x-[20px] bg-black'
                      : 'translate-x-0 bg-white'
                  }`}
                />
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 text-sm text-neutral-300">
                {t('Message font size')} · {fontSize}px
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-neutral-300 transition-colors hover:bg-gray-500/10 disabled:opacity-40 md:h-[36px] md:w-[36px]"
                  title={t('Decrease text size') as string}
                  disabled={fontSize <= FONT_MIN}
                  onClick={() => onFontSizeChange(-1)}
                >
                  <IconLetterA size={16} />
                  <IconArrowBigDown size={12} />
                </button>

                <input
                  type="range"
                  min={FONT_MIN}
                  max={FONT_MAX}
                  step={1}
                  value={fontSize}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-gray-600 accent-white"
                  onChange={(e) => onFontSizeSet(parseInt(e.target.value, 10))}
                />

                <button
                  className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 text-neutral-300 transition-colors hover:bg-gray-500/10 disabled:opacity-40 md:h-[36px] md:w-[36px]"
                  title={t('Increase text size') as string}
                  disabled={fontSize >= FONT_MAX}
                  onClick={() => onFontSizeChange(1)}
                >
                  <IconLetterA size={16} />
                  <IconArrowBigUp size={12} />
                </button>
              </div>
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