import React, { type ReactElement } from 'react';
import classes from './PreviewButton.module.css';
import { PackagesRouter } from 'app-shared/navigation/PackagesRouter';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useMediaQuery } from '@studio/components-legacy';
import { StudioLinkButton, StudioPageHeader } from '@studio/components';
import { useTranslation } from 'react-i18next';
import { PlayFillIcon } from '@studio/icons';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useSearchParams } from 'react-router-dom';

export const PreviewButton = (): ReactElement => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const { org, app } = useStudioEnvironmentParams();

  const [searchParams] = useSearchParams();
  const layout = searchParams?.get('layout');

  const packagesRouter = new PackagesRouter({ org, app });
  const previewLinkQueryParams = layout ? `?layout=${layout}` : '';
  const previewLink: string = `${packagesRouter.getPackageNavigationUrl('preview')}${previewLinkQueryParams}`;

  return (
    <StudioPageHeader.HeaderLink
      aria-label={t('top_menu.preview')}
      className={classes.previewLink}
      data-color='dark'
      renderLink={(props) => (
        <StudioLinkButton href={previewLink} variant='tertiary' {...props}>
          <PlayFillIcon className={classes.playIcon} />
          {shouldDisplayText && t('top_menu.preview')}
        </StudioLinkButton>
      )}
    ></StudioPageHeader.HeaderLink>
  );
};
