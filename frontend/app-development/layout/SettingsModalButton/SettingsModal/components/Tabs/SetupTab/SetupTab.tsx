import React, { ReactNode } from 'react';
import classes from './SetupTab.module.css';
import { useTranslation } from 'react-i18next';
import { useAppMetadataQuery } from 'app-development/hooks/queries';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { LoadingTabData } from '../../LoadingTabData';
import { TabDataError } from '../../TabDataError';
import { ErrorMessage } from '@digdir/design-system-react';
import { DateAndTimeRow } from './DateAndTimeRow/DateAndTimeRow';
import { TabHeader } from '../../TabHeader';
import { Divider } from 'app-shared/primitives';
import { SwitchRow } from './SwitchRow';
import { isDateAfter } from 'app-development/utils/dateUtils';

export type SetupTabProps = {
  org: string;
  app: string;
};

/**
 * @component
 *    Displays the tab rendering the setup tab for an app
 *
 * @property {string}[org] - The org
 * @property {string}[app] - The app
 *
 * @returns {ReactNode} - The rendered component
 */
export const SetupTab = ({ org, app }: SetupTabProps): ReactNode => {
  const { t } = useTranslation();

  const {
    status: appMetadataStatus,
    data: appMetadata,
    error: appMetadataError,
  } = useAppMetadataQuery(org, app);

  const { mutate: updateAppMetadataMutation } = useAppMetadataMutation(org, app);

  const displayContent = () => {
    switch (appMetadataStatus) {
      case 'loading': {
        return <LoadingTabData />;
      }
      case 'error': {
        return (
          <TabDataError>
            {appMetadataError && <ErrorMessage>{appMetadataError.message}</ErrorMessage>}
          </TabDataError>
        );
      }
      case 'success': {
        return (
          <div>
            <div className={classes.dateTimeWrapper}>
              <DateAndTimeRow
                dateLabel={t('settings_modal.setup_tab_valid_from_label')}
                dateValue={appMetadata?.validFrom}
                onSave={(validFrom: string) =>
                  updateAppMetadataMutation({ ...appMetadata, validFrom })
                }
                isDateValid={
                  appMetadata?.validTo && appMetadata?.validFrom
                    ? isDateAfter(appMetadata?.validTo, appMetadata?.validFrom)
                    : true
                }
                invalidDateErrorMessage={t('settings_modal.setup_tab_start_before_end')}
              />
              <div className={classes.endTimeWrapper}>
                <SwitchRow
                  checked={appMetadata?.validTo !== undefined}
                  onSave={(checked: boolean) =>
                    updateAppMetadataMutation({
                      ...appMetadata,
                      validTo: checked ? new Date().toISOString() : undefined,
                    })
                  }
                  label={t('settings_modal.setup_tab_switch_validTo')}
                />
                {appMetadata?.validTo && (
                  <DateAndTimeRow
                    dateLabel={t('settings_modal.setup_tab_valid_to_label')}
                    dateValue={appMetadata?.validTo}
                    onSave={(validTo: string) =>
                      updateAppMetadataMutation({ ...appMetadata, validTo })
                    }
                  />
                )}
              </div>
            </div>
            <Divider className={classes.divider} marginless />
            <SwitchRow
              checked={appMetadata?.autoDeleteOnProcessEnd}
              onSave={(checked: boolean) =>
                updateAppMetadataMutation({
                  ...appMetadata,
                  autoDeleteOnProcessEnd: checked,
                })
              }
              label={t('settings_modal.setup_tab_switch_autoDeleteOnProcessEnd')}
            />
            <SwitchRow
              checked={appMetadata?.messageBoxConfig?.hideSettings?.hideAlways}
              onSave={(checked: boolean) =>
                updateAppMetadataMutation({
                  ...appMetadata,
                  messageBoxConfig: {
                    ...appMetadata.messageBoxConfig,
                    hideSettings: { ...appMetadata.messageBoxConfig, hideAlways: checked },
                  },
                })
              }
              label={t('settings_modal.setup_tab_switch_messageBoxConfig_hideSettings_hideAlways')}
            />
            <SwitchRow
              checked={appMetadata?.copyInstanceSettings?.enabled}
              onSave={(checked: boolean) =>
                updateAppMetadataMutation({
                  ...appMetadata,
                  copyInstanceSettings: { ...appMetadata.copyInstanceSettings, enabled: checked },
                })
              }
              label={t('settings_modal.setup_tab_switch_copyInstanceSettings_enabled')}
            />
            <SwitchRow
              checked={appMetadata?.onEntry?.show === 'select-instance'}
              onSave={(checked: boolean) =>
                updateAppMetadataMutation({
                  ...appMetadata,
                  onEntry: {
                    ...appMetadata.onEntry,
                    show: checked ? 'select-instance' : undefined,
                  },
                })
              }
              label={t('settings_modal.setup_tab_switch_onEntry_show')}
            />
          </div>
        );
      }
    }
  };

  return (
    <div>
      <TabHeader text={t('settings_modal.setup_tab_heading')} />
      {displayContent()}
    </div>
  );
};
