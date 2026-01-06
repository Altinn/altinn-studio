import React from 'react';
import classes from './ContentLibrary.module.css';
import { LibraryHeader } from './LibraryHeader';
import { StudioHeading } from '@studio/components-legacy';
import { LibraryBody } from './LibraryBody';
import type { ContentLibraryConfig } from '../types/ContentLibraryConfig';
import { getPage } from '../pages';

export type ContentLibraryProps = ContentLibraryConfig;

export function ContentLibrary(config: ContentLibraryProps): React.ReactElement {
  const page = getPage(config.router.location);
  if (!page || !page.isConfigured(config)) return <StudioHeading>404 Page Not Found</StudioHeading>; // Show the NotFound page from app-dev instead

  return (
    <div className={classes.libraryBackground}>
      <div className={classes.libraryContainer}>
        <LibraryHeader>{config.heading}</LibraryHeader>
        <LibraryBody config={config} page={page} />
      </div>
    </div>
  );
}
