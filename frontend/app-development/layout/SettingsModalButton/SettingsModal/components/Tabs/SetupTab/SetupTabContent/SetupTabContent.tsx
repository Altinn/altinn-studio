import React, { ReactNode, useState } from 'react';
import classes from './SetupTabContent.module.css';
import { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useTranslation } from 'react-i18next';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { ErrorMessage, Paragraph, Switch, Textfield } from '@digdir/design-system-react';
import { Divider } from 'app-shared/primitives';
import { getIsDatesValid } from 'app-development/layout/SettingsModalButton/SettingsModal/utils/tabUtils/setupTabUtils';
import { TabContent } from '../../../TabContent';

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

  const [startDate, setStartDate] = useState<string>(appMetadata?.validFrom ?? '');
  const [endDate, setEndDate] = useState<string>(appMetadata?.validTo ?? '');
  const [showEndDate, setShowEndDate] = useState<boolean>(appMetadata.validTo !== undefined);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const isInvalidDates: boolean = !getIsDatesValid(appMetadata?.validFrom, appMetadata?.validTo);

  return (
    <TabContent>
      <Switch
        size='small'
        className={classes.switch}
        checked={showEndDate}
        onChange={(e) => {
          setShowEndDate(e.target.checked);
          updateAppMetadataMutation({
            ...appMetadata,
            validTo: e.target.checked ? endDate : undefined,
          });
        }}
      >
        <Paragraph size='small'>{t('settings_modal.setup_tab_switch_validTo')}</Paragraph>
      </Switch>
      <div className={classes.dateWrapper}>
        <div className={classes.dateInputFields}>
          <Textfield
            type='datetime-local'
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            label={t('settings_modal.setup_tab_valid_from_label')}
            size='small'
            onBlur={() => {
              updateAppMetadataMutation({ ...appMetadata, validFrom: startDate });
            }}
            error={isInvalidDates}
            aria-errormessage='invalidDates'
          />
          {showEndDate && (
            <Textfield
              type='datetime-local'
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              label={t('settings_modal.setup_tab_valid_to_label')}
              size='small'
              onBlur={() => {
                updateAppMetadataMutation({ ...appMetadata, validTo: endDate });
              }}
              error={isInvalidDates}
              aria-errormessage='invalidDates'
            />
          )}
        </div>
        {isInvalidDates ? (
          <ErrorMessage id='invalidDates' size='small'>
            {t('settings_modal.setup_tab_start_before_end')}
          </ErrorMessage>
        ) : (
          <div className={classes.errorMessagePlaceHolder} />
        )}
      </div>
      <Divider className={classes.divider} marginless />
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
    </TabContent>
  );
};
