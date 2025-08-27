import React from 'react';
import { useRouterContext } from '../contexts/RouterContext';
import type { PageComponent } from '../utils/router/RouterRouteMapper';
import { RouterRouteMapperImpl } from '../utils/router/RouterRouteMapper';
import type { PagePropsMap } from '../types/PagesProps';
import classes from './ContentLibrary.module.css';
import { LibraryHeader } from './LibraryHeader';
import { StudioHeading } from 'libs/studio-components-legacy/src';
import type { PageName } from '../types/PageName';
import { LibraryBody } from './LibraryBody';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';

export type ContentLibraryProps = ContentLibraryConfig;

export function ContentLibrary(props: ContentLibraryProps): React.ReactElement {
  const { currentPage = 'landingPage' } = useRouterContext();
  return <ContentLibraryForPage {...props} currentPage={currentPage} />;
}

type ContentLibraryForPageProps<T extends PageName> = {
  currentPage: T;
} & ContentLibraryProps;

function ContentLibraryForPage<T extends PageName>({
  pages,
  heading,
  currentPage,
}: ContentLibraryForPageProps<T>): React.ReactElement {
  const router = new RouterRouteMapperImpl(pages);

  const Component: PageComponent<PagePropsMap<T>> = router.configuredRoutes.get(currentPage);
  if (!Component) return <StudioHeading>404 Page Not Found</StudioHeading>; // Show the NotFound page from app-dev instead

  return (
    <div className={classes.libraryBackground}>
      <div className={classes.libraryContainer}>
        <LibraryHeader>{heading}</LibraryHeader>
        <LibraryBody<T> Component={Component} pages={pages} currentPage={currentPage} />
      </div>
    </div>
  );
}
