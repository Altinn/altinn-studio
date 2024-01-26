import type { ReactNode } from 'react';
import React from 'react';
import classes from './SetupTabContent.module.css';
import type { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useTranslation } from 'react-i18next';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { Paragraph, Switch } from '@digdir/design-system-react';

export type SetupTabContentProps = {
  appMetadata: ApplicationMetadata;
  org: string;
  app: string;
};

/**
 * @component
 *    The content of the Setup Tab
 *
 * @property {ApplicationMetadata}[appMetadata] - The application metadata
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const SetupTabContent = ({ appMetadata, org, app }: SetupTabContentProps): ReactNode => {
  const { t } = useTranslation();

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  return (
    <>
      <Switch
        size='small'
        className={classes.switch}
        checked={appMetadata?.autoDeleteOnProcessEnd}
        onChange={(e) =>
          updateAppMetadataMutation({
            ...appMetadata,
            autoDeleteOnProcessEnd: e.target.checked,
          })
        }
      >
        <Paragraph size='small'>
          {t('settings_modal.setup_tab_switch_autoDeleteOnProcessEnd')}
        </Paragraph>
      </Switch>
      <Switch
        size='small'
        className={classes.switch}
        checked={appMetadata?.messageBoxConfig?.hideSettings?.hideAlways}
        onChange={(e) =>
          updateAppMetadataMutation({
            ...appMetadata,
            messageBoxConfig: {
              ...appMetadata.messageBoxConfig,
              hideSettings: { ...appMetadata.messageBoxConfig, hideAlways: e.target.checked },
            },
          })
        }
      >
        <Paragraph size='small'>
          {t('settings_modal.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways')}
        </Paragraph>
      </Switch>
      <Switch
        size='small'
        className={classes.switch}
        checked={appMetadata?.copyInstanceSettings?.enabled}
        onChange={(e) =>
          updateAppMetadataMutation({
            ...appMetadata,
            copyInstanceSettings: {
              ...appMetadata.copyInstanceSettings,
              enabled: e.target.checked,
            },
          })
        }
      >
        <Paragraph size='small'>
          {t('settings_modal.setup_tab_switch_copyInstanceSettings_enabled')}
        </Paragraph>
      </Switch>
      <Switch
        size='small'
        className={classes.switch}
        checked={appMetadata?.onEntry?.show === 'select-instance'}
        onChange={(e) =>
          updateAppMetadataMutation({
            ...appMetadata,
            onEntry: {
              ...appMetadata.onEntry,
              show: e.target.checked ? 'select-instance' : undefined,
            },
          })
        }
      >
        <Paragraph size='small'>{t('settings_modal.setup_tab_switch_onEntry_show')}</Paragraph>
      </Switch>
    </>
  );
};
