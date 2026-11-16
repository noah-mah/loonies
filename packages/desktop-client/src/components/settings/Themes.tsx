import React from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { theme as themeStyle } from '@actual-app/components/theme';
import type { Theme } from '@actual-app/core/types/prefs';
import { css } from '@emotion/css';

import { themeOptions, useTheme } from '#style';

import { SettingsGroup } from './SettingsGroup';
import { SettingsRow } from './SettingsRow';

export function ThemeSettings() {
  const { t } = useTranslation();
  const [theme, switchTheme] = useTheme();

  return (
    <SettingsGroup
      title={t('Themes')}
      description={
        <Trans>
          <span>Themes</span> change the user interface colors.
        </Trans>
      }
    >
      <SettingsRow
        title={t('Theme')}
        control={
          <Select<Theme>
            onChange={switchTheme}
            value={theme}
            options={themeOptions}
            className={css({
              '&[data-hovered]': {
                backgroundColor: themeStyle.buttonNormalBackgroundHover,
              },
              maxWidth: '100%',
            })}
          />
        }
      />
    </SettingsGroup>
  );
}
