import React from 'react';
import { useRouterContext } from '../contexts/RouterContext';
import type { PageComponent } from '../utils/router/RouterRouteMapper';
import { RouterRouteMapperImpl } from '../utils/router/RouterRouteMapper';
import type { PagePropsMap, PagesConfig } from '../types/PagesProps';
import classes from './ContentLibrary.module.css';
import { InfoBox } from './InfoBox';
import { PagesRouter } from './PagesRouter';
import { LibraryHeader } from './LibraryHeader';
import { StudioHeading } from '@studio/components';
import type { PageName } from '../types/PageName';

type ContentLibraryProps = {
  pages: PagesConfig;
};

export function ContentLibrary({ pages }: ContentLibraryProps): React.ReactElement {
  const { currentPage = 'landingPage' } = useRouterContext();
  return <ContentLibraryForPage pages={pages} currentPage={currentPage} />;
}

type ContentLibraryForPageProps<T extends PageName = 'landingPage'> = {
  pages: PagesConfig;
  currentPage: T;
};

function ContentLibraryForPage<T extends PageName = 'landingPage'>({
  pages,
  currentPage,
}: ContentLibraryForPageProps<T>): React.ReactElement {
  const router = new RouterRouteMapperImpl(pages);

  const Component: PageComponent<Required<PagePropsMap>[T]> =
    router.configuredRoutes.get(currentPage);
  if (!Component) return <StudioHeading>404 Page Not Found</StudioHeading>; // Show the NotFound page from app-dev instead

  const componentPropsAreExternal = currentPage !== 'landingPage';

  const componentProps: Required<PagePropsMap>[T] =
    componentPropsAreExternal && (pages[currentPage].props as Required<PagePropsMap>[T]);

  return (
    <div className={classes.libraryBackground}>
      <div className={classes.libraryContainer}>
        <LibraryHeader />
        <div className={classes.libraryContent}>
          <PagesRouter currentPage={currentPage} />
          <div className={classes.component}>
            <Component {...componentProps} />
          </div>
          <InfoBox pageName={currentPage} />
        </div>
      </div>
    </div>
  );
}
