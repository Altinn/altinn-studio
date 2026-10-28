import { useState } from 'react';
import type { ReactElement } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StudioAlert,
  StudioCard,
  StudioError,
  StudioFormActions,
  StudioHeading,
  StudioList,
  StudioParagraph,
  StudioSpinner,
  StudioSwitch,
  StudioTextfield,
} from '@studio/components';
import type { OrgInactivityUndeploySettings } from 'app-shared/types/OrgInactivityUndeploySettings';
import {
  MAX_INACTIVITY_PERIOD_DAYS,
  MIN_INACTIVITY_PERIOD_DAYS,
  parseInactivityPeriodDays,
} from 'app-shared/utils/inactivityPeriodUtils';
import { useRequiredRoutePathsParams } from 'settings/hooks/useRequiredRoutePathsParams';
import { useGetInactivityUndeploySettingsQuery } from './hooks/useGetInactivityUndeploySettingsQuery';
import { useUpdateInactivityUndeploySettingsMutation } from './hooks/useUpdateInactivityUndeploySettingsMutation';
import classes from './Run.module.css';

export const Run = (): ReactElement => {
  const { t } = useTranslation();
  const { owner: org } = useRequiredRoutePathsParams(['owner']);
  const { data: settings, isPending, isError } = useGetInactivityUndeploySettingsQuery(org);

  if (isPending) {
    return <StudioSpinner aria-hidden spinnerTitle={t('settings.orgs.run.loading')} />;
  }

  if (isError) {
    return <StudioError>{t('settings.orgs.run.error')}</StudioError>;
  }

  return (
    <div className={classes.container}>
      <StudioHeading level={2} data-size='md'>
        {t('settings.orgs.run.page_heading')}
      </StudioHeading>
      <InactivityUndeployForm org={org} settings={settings} />
    </div>
  );
};

type InactivityUndeployFormProps = {
  org: string;
  settings: OrgInactivityUndeploySettings;
};

type InactivityUndeployDraft = {
  undeployOnInactivity: boolean;
  inactivityPeriodDays: string;
};

const createDraft = (settings: OrgInactivityUndeploySettings): InactivityUndeployDraft => ({
  undeployOnInactivity: settings.undeployOnInactivity,
  inactivityPeriodDays: String(settings.inactivityPeriodDays),
});

function InactivityUndeployForm({ org, settings }: InactivityUndeployFormProps): ReactElement {
  const { t } = useTranslation();
  const { mutate: updateSettings, isPending: isSaving } =
    useUpdateInactivityUndeploySettingsMutation(org);
  const [draft, setDraft] = useState<InactivityUndeployDraft>(() => createDraft(settings));

  const periodDays = parseInactivityPeriodDays(draft.inactivityPeriodDays);
  const isPeriodInvalid = periodDays === null;
  const isDirty =
    isPeriodInvalid ||
    draft.undeployOnInactivity !== settings.undeployOnInactivity ||
    periodDays !== settings.inactivityPeriodDays;
  const periodLimits = { min: MIN_INACTIVITY_PERIOD_DAYS, max: MAX_INACTIVITY_PERIOD_DAYS };

  const handleSave = (): void => {
    if (isPeriodInvalid) return;
    updateSettings({
      undeployOnInactivity: draft.undeployOnInactivity,
      inactivityPeriodDays: periodDays,
    });
  };

  const handleCancel = (): void => setDraft(createDraft(settings));

  return (
    <StudioCard className={classes.card}>
      <div className={classes.sectionHeading}>
        <StudioHeading level={3} data-size='xs'>
          {t('settings.orgs.run.inactivity_undeploy_heading')}
        </StudioHeading>
        <StudioParagraph>{t('settings.orgs.run.inactivity_undeploy_description')}</StudioParagraph>
        <StudioParagraph>{t('settings.orgs.run.inactivity_undeploy_app_override')}</StudioParagraph>
      </div>
      <StudioSwitch
        label={t('settings.orgs.run.inactivity_undeploy_switch_label')}
        checked={draft.undeployOnInactivity}
        onChange={(event) => setDraft({ ...draft, undeployOnInactivity: event.target.checked })}
        position='end'
        data-size='md'
      />
      <StudioTextfield
        className={classes.daysField}
        label={t('settings.orgs.run.inactivity_undeploy_days_label')}
        description={t('settings.orgs.run.inactivity_undeploy_days_description', periodLimits)}
        type='number'
        inputMode='numeric'
        min={MIN_INACTIVITY_PERIOD_DAYS}
        max={MAX_INACTIVITY_PERIOD_DAYS}
        value={draft.inactivityPeriodDays}
        onChange={(event) => setDraft({ ...draft, inactivityPeriodDays: event.target.value })}
        error={
          isPeriodInvalid && t('settings.orgs.run.inactivity_undeploy_days_error', periodLimits)
        }
      />
      <StudioFormActions
        primary={{
          label: t('general.save'),
          onClick: handleSave,
          disabled: !isDirty || isPeriodInvalid,
        }}
        secondary={{ label: t('general.cancel'), onClick: handleCancel, disabled: !isDirty }}
        isLoading={isSaving}
      />
      <StudioAlert data-color='info'>
        <StudioList.Unordered>
          <StudioList.Item>
            {t('settings.orgs.run.inactivity_undeploy_info_test_environments')}
          </StudioList.Item>
          <StudioList.Item>
            {t('settings.orgs.run.inactivity_undeploy_info_activity')}
          </StudioList.Item>
          <StudioList.Item>
            {t('settings.orgs.run.inactivity_undeploy_info_background_work')}
          </StudioList.Item>
          <StudioList.Item>
            {t('settings.orgs.run.inactivity_undeploy_info_publish_again')}
          </StudioList.Item>
        </StudioList.Unordered>
      </StudioAlert>
    </StudioCard>
  );
}
