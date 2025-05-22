import React from 'react';
import { Alert } from '@digdir/designsystemet-react';
import { StudioButton, StudioRedirectBox } from '@studio/components-legacy';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';
import { useTranslation } from 'react-i18next';
import { ShieldLockIcon } from '@studio/icons';
import classes from './EditPolicy.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { FeatureFlag, shouldDisplayFeature } from 'app-shared/utils/featureToggleUtils';

export const EditPolicy = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();
  const { openPolicyEditor } = useBpmnApiContext();

  const isNewFeature: boolean = shouldDisplayFeature(FeatureFlag.SettingsPage);
  const packagesRouter = new PackagesRouter({ org, app });
  const settingsPageHref: string = packagesRouter.getPackageNavigationUrl(
    'appSettings',
    '?currentTab=policy',
  );

  return (
    <div className={classes.configContent}>
      <Alert severity='info' className={classes.alert}>
        {t('process_editor.configuration_panel.edit_policy_alert_message')}
      </Alert>
      <StudioRedirectBox
        title={t('process_editor.configuration_panel.edit_policy_open_policy_editor_heading')}
      >
        <StudioButton
          as={isNewFeature ? 'a' : undefined}
          onClick={!isNewFeature ? openPolicyEditor : undefined}
          href={isNewFeature ? settingsPageHref : undefined}
          className={isNewFeature ? classes.link : undefined}
          variant='primary'
          color='second'
          icon={<ShieldLockIcon />}
          iconPlacement='left'
        >
          {t('process_editor.configuration_panel.edit_policy_open_policy_editor_button')}
        </StudioButton>
      </StudioRedirectBox>
    </div>
  );
};
