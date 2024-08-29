import React from 'react';
import classes from './AppPreviewSubMenu.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { StudioPageHeaderButton, useMediaQuery } from '@studio/components';
import { ArrowLeftIcon } from '@studio/icons';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';

export const AppPreviewSubMenu = () => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org, app } = useStudioEnvironmentParams();
  const { data: instanceId } = useInstanceIdQuery(org, app);

  const packagesRouter = new PackagesRouter({ org, app });
  const queryParams: string = `?layout=${window.localStorage.getItem(instanceId)}`;
  const backToEditLink: string = `${packagesRouter.getPackageNavigationUrl('editorUiEditor')}${queryParams}`;

  return (
    <div className={classes.subHeader}>
      <StudioPageHeaderButton asChild color='dark' variant='preview'>
        <a href={backToEditLink}>
          <ArrowLeftIcon className={classes.icon} />
          {shouldDisplayText && t('top_menu.preview_back_to_editing')}
        </a>
      </StudioPageHeaderButton>
    </div>
  );
};
