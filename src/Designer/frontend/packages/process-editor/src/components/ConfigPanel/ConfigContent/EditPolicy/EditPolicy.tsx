import React from 'react';
import { StudioAlert } from '@studio/components';
import { StudioButton, StudioRedirectBox } from '@studio/components-legacy';
import { useTranslation } from 'react-i18next';
import { ShieldLockIcon } from '@studio/icons';
import classes from './EditPolicy.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { typedLocalStorage } from '@studio/pure-functions';
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
      <StudioAlert severity='info' className={classes.alert}>
        {t('process_editor.configuration_panel.edit_policy_alert_message')}
      </StudioAlert>
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
