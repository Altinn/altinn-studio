import React from 'react';
import classes from './LibraryBody.module.css';
import { PagesRouter } from './PagesRouter';
import type { PageName } from '../../types/PageName';
import type { ContentLibraryConfig } from '../../types/ContentLibraryConfig';
import type { Page } from '../../pages/Page';

type LibraryBodyProps<T extends PageName> = {
  config: ContentLibraryConfig;
  page: Page<T>;
};

export function LibraryBody<T extends PageName>({ config, page }: LibraryBodyProps<T>) {
  return (
    <div className={classes.libraryContent}>
      <PagesRouter config={config} />
      <PageView<T> config={config} page={page} />
    </div>
  );
}

type PageViewProps<T extends PageName> = {
  config: ContentLibraryConfig;
  page: Page<T>;
};

function PageView<T extends PageName>({ config, page }: PageViewProps<T>) {
  return <div className={classes.component}>{page.renderPage(config)}</div>;
}
