import React, { type ReactElement } from 'react';
import classes from './PreviewButton.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeader, useMediaQuery } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PlayFillIcon } from '@studio/icons';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from 'app-development/contexts/PageHeaderContext';
import { useSearchParams } from 'react-router-dom';

export const PreviewButton = (): ReactElement => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org, app } = useStudioEnvironmentParams();
  const { variant } = usePageHeaderContext();

  const [searchParams] = useSearchParams();
  const layout = searchParams?.get('layout');

  const packagesRouter = new PackagesRouter({ org, app });
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${layout ? `?layout=${layout}` : ''}`;

  return (
    <StudioPageHeader.HeaderButton asChild color='dark' variant={variant}>
      <a href={previewLink} className={classes.previewLink} aria-label={t('top_menu.preview')}>
        <PlayFillIcon className={classes.playIcon} />
        {shouldDisplayText && t('top_menu.preview')}
      </a>
    </StudioPageHeader.HeaderButton>
  );
};