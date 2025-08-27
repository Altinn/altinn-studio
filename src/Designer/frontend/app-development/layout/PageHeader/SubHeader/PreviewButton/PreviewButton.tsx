import React, { type ReactElement } from 'react';
import classes from './PreviewButton.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { StudioPageHeader, useMediaQuery } from 'libs/studio-components-legacy/src';
import { useTranslation } from 'react-i18next';
import { PlayFillIcon } from 'libs/studio-icons/src';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { usePageHeaderContext } from '../../../../contexts/PageHeaderContext';
import { useSearchParams } from 'react-router-dom';

export const PreviewButton = (): ReactElement => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org, app } = useStudioEnvironmentParams();
  const { variant } = usePageHeaderContext();

  const [searchParams] = useSearchParams();
  const layout = searchParams?.get('layout');

  const packagesRouter = new PackagesRouter({ org, app });
  const previewLinkQueryParams = layout ? `?layout=${layout}` : '';
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${previewLinkQueryParams}`;

  return (
    <StudioPageHeader.HeaderButton
      aria-label={t('top_menu.preview')}
      as='a'
      className={classes.previewLink}
      color='dark'
      href={previewLink}
      variant={variant}
    >
      <PlayFillIcon className={classes.playIcon} />
      {shouldDisplayText && t('top_menu.preview')}
    </StudioPageHeader.HeaderButton>
  );
};
