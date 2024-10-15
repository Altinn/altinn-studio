import React from 'react';
import classes from './PagesRouter.module.css';
import { StudioParagraph } from '@studio/components';
import type { PagesConfig } from '../../types/PagesProps';
import { useRouterContext } from '../../contexts/RouterContext';
import type { PageName } from '../../types/PageName';
import { pagesRouterConfigs } from './PagesRouterConfigs';
import { useTranslation } from 'react-i18next';

type PagesRouterProps = {
  pages: PagesConfig;
};

export const PagesRouter = ({ pages }: PagesRouterProps) => {
  const { navigate, currentPage } = useRouterContext();
  const { t } = useTranslation();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  const pageList = Object.keys(pages) as PageName[];

  return (
    <div className={classes.pagesRouterContainer}>
      {pageList.map((page) => (
        <div
          className={currentPage === page ? classes.pageIsSelected : classes.pageNavigation}
          onClick={() => handleNavigation(page)}
          key={page}
        >
          {pagesRouterConfigs[page].icon}
          <StudioParagraph>{t(pagesRouterConfigs[page].pageTitleTextKey)}</StudioParagraph>
        </div>
      ))}
    </div>
  );
};
