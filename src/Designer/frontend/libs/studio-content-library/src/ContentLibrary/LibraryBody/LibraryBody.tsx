import React from 'react';
import classes from './LibraryBody.module.css';
import { PagesRouter } from './PagesRouter';
import type { PagePropsMap, PagesConfig } from '../../types/PagesProps';
import { PageName } from '../../types/PageName';
import type { PageComponent } from '../../utils/router/RouterRouteMapper';

type LibraryBodyProps<T extends PageName> = {
  Component: PageComponent<PagePropsMap<T>>;
  pages: PagesConfig;
  currentPage: T;
};

export function LibraryBody<T extends PageName>({
  Component,
  pages,
  currentPage,
}: LibraryBodyProps<T>) {
  const componentProps: PagePropsMap<T> = getComponentProps(pages, currentPage);

  return (
    <div className={classes.libraryContent}>
      <PagesRouter pageNames={getAllPageNamesFromPagesConfig(pages)} />
      <Page<T> Component={Component} componentProps={componentProps} currentPage={currentPage} />
    </div>
  );
}

type PageProps<T extends PageName> = {
  Component: PageComponent<PagePropsMap<T>>;
  componentProps: PagePropsMap<T>;
  currentPage: T;
};

function Page<T extends PageName>({ Component, componentProps, currentPage }: PageProps<T>) {
  return (
    <div className={classes.component}>
      <Component {...componentProps} />
    </div>
  );
}

const getComponentProps = <T extends PageName>(
  pages: PagesConfig,
  currentPage: T,
): PagePropsMap<T> => {
  if (currentPage === PageName.LandingPage) return {} as PagePropsMap<T>;
  return pages[currentPage].props;
};

const getAllPageNamesFromPagesConfig = (pages: PagesConfig): PageName[] => {
  const customPages = Object.keys(pages) as PageName[];
  return [PageName.LandingPage, ...customPages];
};
