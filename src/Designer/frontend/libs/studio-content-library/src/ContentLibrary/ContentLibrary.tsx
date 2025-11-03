import React from 'react';
import { useRouterContext } from '../contexts/RouterContext';
import classes from './ContentLibrary.module.css';
import { LibraryHeader } from './LibraryHeader';
import { StudioHeading } from '@studio/components-legacy';
import { PageName } from '../types/PageName';
import { LibraryBody } from './LibraryBody';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';
import { getPage } from '../pages';

export type ContentLibraryProps = ContentLibraryConfig;

export function ContentLibrary(props: ContentLibraryProps): React.ReactElement {
  const { currentPage = PageName.LandingPage } = useRouterContext();
  return <ContentLibraryForPage config={props} currentPage={currentPage} />;
}

type ContentLibraryForPageProps<T extends PageName> = {
  config: ContentLibraryConfig;
  currentPage: T;
};

function ContentLibraryForPage<T extends PageName>({
  config,
  currentPage,
}: ContentLibraryForPageProps<T>): React.ReactElement {
  const page = getPage<T>(currentPage);
  if (!page || !page.isConfigured(config)) return <StudioHeading>404 Page Not Found</StudioHeading>; // Show the NotFound page from app-dev instead

  return (
    <div className={classes.libraryBackground}>
      <div className={classes.libraryContainer}>
        <LibraryHeader>{config.heading}</LibraryHeader>
        <LibraryBody<T> config={config} page={page} />
      </div>
    </div>
  );
}
