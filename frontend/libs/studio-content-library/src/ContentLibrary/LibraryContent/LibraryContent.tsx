import React from 'react';
import classes from './LibraryContent.module.css';
import { PagesRouter } from './PagesRouter';
import { InfoBox } from './InfoBox';
import type { PagePropsMap, PagesConfig } from '../../types/PagesProps';
import type { PageName } from '../../types/PageName';
import type { PageComponent } from '../../utils/router/RouterRouteMapper';

type LibraryContentProps<T extends PageName = 'landingPage'> = {
  Component: PageComponent<Required<PagePropsMap>[T]>;
  pages: PagesConfig;
  currentPage: PageName;
};

export function LibraryContent<T extends PageName = 'landingPage'>({
  Component,
  pages,
  currentPage,
}: LibraryContentProps) {
  const componentPropsAreExternal = currentPage !== 'landingPage';

  const componentProps: Required<PagePropsMap>[T] =
    componentPropsAreExternal && (pages[currentPage].props as Required<PagePropsMap>[T]);

  return (
    <div className={classes.libraryContent}>
      <PagesRouter pageNames={getAllPageNamesFromPagesConfig(pages)} />
      <div className={classes.component}>
        <Component {...componentProps} />
      </div>
      <InfoBox pageName={currentPage} />
    </div>
  );
}

const getAllPageNamesFromPagesConfig = (pages: PagesConfig): PageName[] => {
  const customPages = Object.keys(pages) as PageName[];
  return ['landingPage', ...customPages];
};
