import React, { ReactNode, useState } from 'react';
import classes from './SetupTabContent.module.css';
import { ApplicationMetadata } from 'app-shared/types/ApplicationMetadata';
import { useTranslation } from 'react-i18next';
import { useAppMetadataMutation } from 'app-development/hooks/mutations';
import { isDateAfter } from 'app-development/utils/dateUtils';
import { ErrorMessage, Textfield } from '@digdir/design-system-react';
import { SwitchRow } from './SwitchRow';
import { Divider } from 'app-shared/primitives';

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

  const getIsDatesValid = () => {
    const from = appMetadata?.validFrom;
    const to = appMetadata?.validTo;

    if (from === undefined || to === undefined) return true;
    if (from && to) return isDateAfter(to, from);
    return true;
  };

  const getErrorMessage = () => {
    if (!getIsDatesValid()) {
      return t('settings_modal.setup_tab_start_before_end');
    }
    return '';
  };

  return (
    <div>
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
            error={!getIsDatesValid()}
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
              error={!getIsDatesValid()}
            />
          )}
        </div>
        <ErrorMessage className={classes.errorMessage} size='small'>
          {getErrorMessage()}
        </ErrorMessage>
      </div>
      <SwitchRow
        checked={showEndDate}
        onSave={(checked: boolean) => {
          setShowEndDate(checked);
          updateAppMetadataMutation({
            ...appMetadata,
            validTo: checked ? endDate : undefined,
          });
        }}
        label={t('settings_modal.setup_tab_switch_validTo')}
      />
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
};
