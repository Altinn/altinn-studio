import React from 'react';
import { Alert } from '@digdir/designsystemet-react';
import { StudioButton, StudioRedirectBox } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { ShieldLockIcon } from 'libs/studio-icons/src';
import classes from './EditPolicy.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { typedLocalStorage } from 'libs/studio-pure-functions/src';
import { LocalStorageKey } from 'app-shared/enums/LocalStorageKey';

export const EditPolicy = () => {
  const { t } = useTranslation();
  const { org, app } = useStudioEnvironmentParams();

  const packagesRouter = new PackagesRouter({ org, app });
  const settingsPageHref: string = packagesRouter.getPackageNavigationUrl(
    'appSettings',
    '?currentTab=policy',
  );

  const handleClick = () => {
    typedLocalStorage.setItem<RoutePaths>(
      LocalStorageKey.PreviousRouteBeforeSettings,
      RoutePaths.ProcessEditor,
    );
  };

  return (
    <div className={classes.configContent}>
      <Alert severity='info' className={classes.alert}>
        {t('process_editor.configuration_panel.edit_policy_alert_message')}
      </Alert>
      <StudioRedirectBox
        title={t('process_editor.configuration_panel.edit_policy_open_policy_editor_heading')}
      >
        <StudioButton
          as='a'
          onClick={handleClick}
          href={settingsPageHref}
          className={classes.link}
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
