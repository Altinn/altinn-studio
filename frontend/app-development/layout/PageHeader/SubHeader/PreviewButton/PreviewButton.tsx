import React, { type ReactElement } from 'react';
import classes from './PreviewButton.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useSelectedFormLayoutSetName, useSelectedFormLayoutName } from '@altinn/ux-editor/hooks';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeaderButton, useMediaQuery } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PlayFillIcon } from '@studio/icons';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';

export const PreviewButton = (): ReactElement => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org, app } = useStudioEnvironmentParams();
  const { selectedFormLayoutSetName } = useSelectedFormLayoutSetName();
  const { selectedFormLayoutName } = useSelectedFormLayoutName(selectedFormLayoutSetName);
  const { variant } = usePageHeaderContext();

  const packagesRouter = new PackagesRouter({ org, app });
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${selectedFormLayoutName ? `?layout=${selectedFormLayoutName}` : ''}`;

  return (
    <StudioPageHeaderButton asChild color='dark' variant={variant}>
      <a href={previewLink} className={classes.previewLink}>
        <PlayFillIcon className={classes.playIcon} />
        {shouldDisplayText && t('top_menu.preview')}
      </a>
    </StudioPageHeaderButton>
  );
};
