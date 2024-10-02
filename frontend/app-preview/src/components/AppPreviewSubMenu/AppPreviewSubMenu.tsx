import React from 'react';
import classes from './AppPreviewSubMenu.module.css';
import { useTranslation } from 'react-i18next';
import { StudioPageHeaderButton, useMediaQuery } from '@studio/components';
import { ArrowLeftIcon } from '@studio/icons';
import { MEDIA_QUERY_MAX_WIDTH } from 'app-shared/constants';
import { useBackToEditingHref } from 'app-preview/src/hooks/useBackToEditingHref';

export const AppPreviewSubMenu = () => {
  const { t } = useTranslation();
  const shouldDisplayText = !useMediaQuery(MEDIA_QUERY_MAX_WIDTH);
  const backToEditingHref: string = useBackToEditingHref();

  return (
    <div className={classes.subHeader}>
      <StudioPageHeaderButton asChild color='dark' variant='preview'>
        <a href={backToEditingHref} aria-label={t('top_menu.preview_back_to_editing')}>
          <ArrowLeftIcon className={classes.icon} />
          {shouldDisplayText && t('top_menu.preview_back_to_editing')}
        </a>
      </StudioPageHeaderButton>
    </div>
  );
};
