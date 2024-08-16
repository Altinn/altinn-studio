import React from 'react';
import classes from './AppPreviewSubMenu.module.css';
import { useTranslation } from 'react-i18next';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { StudioPageHeaderButton, useMediaQuery } from '@studio/components';
import { ArrowLeftIcon } from '@navikt/aksel-icons';
import { useInstanceIdQuery } from 'app-shared/hooks/queries';
import { WINDOW_RESIZE_WIDTH } from 'app-shared/utils/resizeUtils';

export const AppPreviewSubMenu = () => {
  const { t } = useTranslation();
  const shouldResizeWindow = useMediaQuery(`(max-width: ${WINDOW_RESIZE_WIDTH}px)`);
  const { org, app } = useStudioEnvironmentParams();
  const { data: instanceId } = useInstanceIdQuery(org, app);

  const packagesRouter = new PackagesRouter({ org, app });
  const queryParams: string = `?layout=${window.localStorage.getItem(instanceId)}`;
  const backToEditLink: string = `${packagesRouter.getPackageNavigationUrl('editorUiEditor')}${queryParams}`;

  return (
    <div className={classes.subHeader}>
      <StudioPageHeaderButton asChild color='dark'>
        <a href={backToEditLink}>
          <ArrowLeftIcon className={classes.icon} />
          {!shouldResizeWindow && t('top_menu.preview_back_to_editing')}
        </a>
      </StudioPageHeaderButton>
    </div>
  );
};
