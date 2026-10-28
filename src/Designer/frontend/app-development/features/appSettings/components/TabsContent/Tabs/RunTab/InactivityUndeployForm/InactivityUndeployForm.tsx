import { useId, useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioCard,
  StudioFormActions,
  StudioList,
  StudioRadio,
  StudioRadioGroup,
  StudioTextfield,
} from '@studio/components';
import type { AppSettings, AppSettingsPayload } from 'app-shared/types/AppSettings';
import {
  MAX_INACTIVITY_PERIOD_DAYS,
  MIN_INACTIVITY_PERIOD_DAYS,
} from 'app-shared/utils/inactivityPeriodUtils';
import {
  PeriodChoice,
  UndeployChoice,
  createDraft,
  hasChanges,
  isCustomPeriodInvalid,
  toPayload,
} from './inactivityUndeployFormUtils';
import type { InactivityUndeployDraft } from './inactivityUndeployFormUtils';
import classes from './InactivityUndeployForm.module.css';

export type InactivityUndeployFormProps = {
  appSettings: AppSettings;
  canEdit: boolean;
  isSaving: boolean;
  onSave: (payload: AppSettingsPayload) => void;
};

export function InactivityUndeployForm({
  appSettings,
  canEdit,
  isSaving,
  onSave,
}: InactivityUndeployFormProps): ReactElement {
  const { t } = useTranslation();
  const undeployGroupName = useId();
  const periodGroupName = useId();
  const [draft, setDraft] = useState<InactivityUndeployDraft>(() => createDraft(appSettings));

  const isDirty = hasChanges(draft, appSettings);
  const payload = toPayload(draft);
  const isPeriodInvalid = isCustomPeriodInvalid(draft);
  const periodLimits = { min: MIN_INACTIVITY_PERIOD_DAYS, max: MAX_INACTIVITY_PERIOD_DAYS };

  const updateDraft = (changes: Partial<InactivityUndeployDraft>): void =>
    setDraft((previousDraft) => ({ ...previousDraft, ...changes }));

  const handleSave = (): void => {
    if (payload) onSave(payload);
  };

  const handleCancel = (): void => setDraft(createDraft(appSettings));

  const inheritedUndeployLabel = appSettings.orgUndeployOnInactivity
    ? t('app_settings.run_tab_undeploy_inherit_on')
    : t('app_settings.run_tab_undeploy_inherit_off');

  const undeployOptions = [
    { value: UndeployChoice.Inherit, label: inheritedUndeployLabel },
    { value: UndeployChoice.On, label: t('app_settings.run_tab_undeploy_on') },
    { value: UndeployChoice.Off, label: t('app_settings.run_tab_undeploy_off') },
  ];

  const periodOptions = [
    {
      value: PeriodChoice.Inherit,
      label: t('app_settings.run_tab_period_inherit', {
        days: appSettings.orgInactivityPeriodDays,
      }),
    },
    { value: PeriodChoice.Custom, label: t('app_settings.run_tab_period_custom') },
  ];

  return (
    <StudioCard className={classes.card}>
      <StudioRadioGroup
        legend={t('app_settings.run_tab_undeploy_legend')}
        description={t('app_settings.run_tab_undeploy_description')}
        disabled={!canEdit}
      >
        {undeployOptions.map((option) => (
          <StudioRadio
            key={option.value}
            name={undeployGroupName}
            value={option.value}
            label={option.label}
            checked={draft.undeployChoice === option.value}
            onChange={() => updateDraft({ undeployChoice: option.value })}
          />
        ))}
      </StudioRadioGroup>
      <StudioRadioGroup
        legend={t('app_settings.run_tab_period_legend')}
        description={t('app_settings.run_tab_period_description')}
        disabled={!canEdit}
      >
        {periodOptions.map((option) => (
          <StudioRadio
            key={option.value}
            name={periodGroupName}
            value={option.value}
            label={option.label}
            checked={draft.periodChoice === option.value}
            onChange={() => updateDraft({ periodChoice: option.value })}
          />
        ))}
        {draft.periodChoice === PeriodChoice.Custom && (
          <StudioTextfield
            className={classes.daysField}
            label={t('app_settings.run_tab_period_days_label')}
            description={t('app_settings.run_tab_period_days_description', periodLimits)}
            type='number'
            inputMode='numeric'
            min={MIN_INACTIVITY_PERIOD_DAYS}
            max={MAX_INACTIVITY_PERIOD_DAYS}
            value={draft.customPeriodDays}
            onChange={(event) => updateDraft({ customPeriodDays: event.target.value })}
            error={isPeriodInvalid && t('app_settings.run_tab_period_days_error', periodLimits)}
            disabled={!canEdit}
          />
        )}
      </StudioRadioGroup>
      <StudioFormActions
        primary={{
          label: t('general.save'),
          onClick: handleSave,
          disabled: !canEdit || !isDirty || !payload,
        }}
        secondary={{
          label: t('general.cancel'),
          onClick: handleCancel,
          disabled: !canEdit || !isDirty,
        }}
        isLoading={isSaving}
      />
      <StudioAlert data-color='info'>
        <StudioList.Unordered>
          <StudioList.Item>{t('app_settings.run_tab_info_test_environments')}</StudioList.Item>
          <StudioList.Item>{t('app_settings.run_tab_info_activity')}</StudioList.Item>
          <StudioList.Item>{t('app_settings.run_tab_info_background_work')}</StudioList.Item>
          <StudioList.Item>{t('app_settings.run_tab_info_publish_again')}</StudioList.Item>
        </StudioList.Unordered>
      </StudioAlert>
    </StudioCard>
  );
}
