import { PluginID, PluginKey } from '@/types/plugin';
import { FC } from 'react';
import { useTranslation } from 'react-i18next';

interface Props {
  pluginKeys: PluginKey[];
  onPluginKeyChange: (pluginKey: PluginKey) => void;
  onClearPluginKey: (pluginKey: PluginKey) => void;
}

const inputClassName =
  'mt-2 w-full rounded-lg border border-neutral-500 px-4 py-2 text-neutral-900 shadow focus:outline-none dark:border-neutral-800 dark:border-opacity-50 dark:bg-[#40414F] dark:text-neutral-100';

export const PluginKeysSection: FC<Props> = ({
  pluginKeys,
  onPluginKeyChange,
  onClearPluginKey,
}) => {
  const { t } = useTranslation('sidebar');

  const upsertKey = (key: 'TAVILY_API_KEY', value: string) => {
    const pluginKey = pluginKeys.find(
      (p) => p.pluginId === PluginID.GOOGLE_SEARCH,
    );

    if (pluginKey) {
      onPluginKeyChange({
        ...pluginKey,
        requiredKeys: pluginKey.requiredKeys.map((k) => {
          if (k.key === key) {
            return { ...k, value };
          }
          return k;
        }),
      });
    } else {
      onPluginKeyChange({
        pluginId: PluginID.GOOGLE_SEARCH,
        requiredKeys: [{ key: 'TAVILY_API_KEY', value }],
      });
    }
  };

  const apiKey = pluginKeys
    .find((p) => p.pluginId === PluginID.GOOGLE_SEARCH)
    ?.requiredKeys.find((k) => k.key === 'TAVILY_API_KEY')?.value;

  return (
    <div>
      <p className="mb-2 text-[12px] leading-relaxed text-neutral-400">
        {t(
          'Enter your Tavily API key to enable the Web Search plugin. It lets the AI search the live web and answer with sources.',
        )}
      </p>

      <div className="text-[13px] font-semibold text-white">
        {t('Tavily API Key')}
      </div>
      <input
        className={inputClassName}
        type="password"
        value={apiKey || ''}
        onChange={(e) => upsertKey('TAVILY_API_KEY', e.target.value)}
      />

      <button
        className="mt-4 w-full rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white hover:bg-gray-500/10"
        onClick={() => {
          const pluginKey = pluginKeys.find(
            (p) => p.pluginId === PluginID.GOOGLE_SEARCH,
          );
          if (pluginKey) {
            onClearPluginKey(pluginKey);
          }
        }}
      >
        {t('Clear Web Search Plugin Keys')}
      </button>
    </div>
  );
};