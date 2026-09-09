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

  const upsertKey = (key: 'GOOGLE_API_KEY' | 'GOOGLE_CSE_ID', value: string) => {
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
      const requiredKeys =
        key === 'GOOGLE_API_KEY'
          ? [
              { key: 'GOOGLE_API_KEY', value },
              { key: 'GOOGLE_CSE_ID', value: '' },
            ]
          : [
              { key: 'GOOGLE_API_KEY', value: '' },
              { key: 'GOOGLE_CSE_ID', value },
            ];

      onPluginKeyChange({
        pluginId: PluginID.GOOGLE_SEARCH,
        requiredKeys,
      });
    }
  };

  const apiKey = pluginKeys
    .find((p) => p.pluginId === PluginID.GOOGLE_SEARCH)
    ?.requiredKeys.find((k) => k.key === 'GOOGLE_API_KEY')?.value;

  const cseId = pluginKeys
    .find((p) => p.pluginId === PluginID.GOOGLE_SEARCH)
    ?.requiredKeys.find((k) => k.key === 'GOOGLE_CSE_ID')?.value;

  return (
    <div>
      <p className="mb-2 text-[12px] leading-relaxed text-neutral-400">
        {t(
          'Enter your Google API Key and Google CSE ID to enable the Google Search plugin.',
        )}
      </p>

      <div className="text-[13px] font-semibold text-white">
        {t('Google API Key')}
      </div>
      <input
        className={inputClassName}
        type="password"
        value={apiKey || ''}
        onChange={(e) => upsertKey('GOOGLE_API_KEY', e.target.value)}
      />

      <div className="mt-4 text-[13px] font-semibold text-white">
        {t('Google CSE ID')}
      </div>
      <input
        className={inputClassName}
        type="password"
        value={cseId || ''}
        onChange={(e) => upsertKey('GOOGLE_CSE_ID', e.target.value)}
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
        {t('Clear Google Search Plugin Keys')}
      </button>
    </div>
  );
};