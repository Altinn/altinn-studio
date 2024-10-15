import React from 'react';
import classes from './LibraryHeader.module.css';
import { pagesRouterConfigs } from '../pagesRouter/PagesRouterConfigs';
import type { PageName } from '../../types/PageName';
import { useRouterContext } from '../../contexts/RouterContext';
import { StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';

export const LibraryHeader = () => {
  const { navigate } = useRouterContext();
  const { t } = useTranslation();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  return (
    <div className={classes.libraryHeading} onClick={() => handleNavigation('landingPage')}>
      <div className={classes.libraryLandingPageNavigation}>
        {pagesRouterConfigs['landingPage'].icon}
        <StudioHeading size='small'>
          {t(pagesRouterConfigs['landingPage'].pageTitleTextKey)}
        </StudioHeading>
      </div>
    </div>
  );
};
