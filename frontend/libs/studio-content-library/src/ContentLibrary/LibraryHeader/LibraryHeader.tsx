import React from 'react';
import classes from './LibraryHeader.module.css';
import { pagesRouterConfigs } from '../PagesRouter';
import type { PageName } from '../../types/PageName';
import { useRouterContext } from '../../contexts/RouterContext';
import { StudioHeading } from '@studio/components';
import { useTranslation } from 'react-i18next';

export function LibraryHeader(): React.ReactElement {
  const { navigate } = useRouterContext();
  const { t } = useTranslation();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  return (
    <div className={classes.libraryHeading}>
      <div
        className={classes.libraryLandingPageNavigation}
        onClick={() => handleNavigation('landingPage')}
      >
        {pagesRouterConfigs['landingPage'].icon}
        <StudioHeading size='small'>
          {t(pagesRouterConfigs['landingPage'].pageTitleTextKey)}
        </StudioHeading>
      </div>
    </div>
  );
}
