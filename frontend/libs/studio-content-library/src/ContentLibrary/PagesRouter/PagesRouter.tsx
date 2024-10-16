import React from 'react';
import classes from './PagesRouter.module.css';
import { useRouterContext } from '../../contexts/RouterContext';
import type { PageName } from '../../types/PageName';
import { pagesRouterConfigs } from './pagesRouterConfigs';
import { useTranslation } from 'react-i18next';
import { StudioParagraph } from '@studio/components';

type PagesRouterProps = {
  pageNames: PageName[];
};

export function PagesRouter({ pageNames }: PagesRouterProps): React.ReactElement {
  const { navigate, currentPage } = useRouterContext();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  return (
    <div className={classes.pagesRouterContainer}>
      {pageNames.map((pageName) => (
        <PageNavigationTile
          key={pageName}
          currentPage={currentPage}
          pageName={pageName}
          onClick={handleNavigation}
        />
      ))}
    </div>
  );
}

type PageNavigationTileProps = {
  currentPage: PageName;
  pageName: PageName;
  onClick: (newPage: PageName) => void;
};

export function PageNavigationTile({
  currentPage,
  pageName,
  onClick,
}: PageNavigationTileProps): React.ReactElement {
  const { t } = useTranslation();

  return (
    <div
      className={currentPage === pageName ? classes.pageIsSelected : classes.pageNavigation}
      onClick={() => onClick(pageName)}
    >
      {pagesRouterConfigs[pageName].icon}
      <StudioParagraph>{t(pagesRouterConfigs[pageName].pageTitleTextKey)}</StudioParagraph>
    </div>
  );
}
