import React from 'react';
import { useRouterContext } from '../contexts/RouterContext';
import { RouterRouteMapperImpl } from '../utils/router/RouterRouteMapper';
import type { PagesConfig } from '../types/PagesProps';
import { PagePropsMap } from '../types/PagesProps';
import classes from './ContentLibrary.module.css';
import { InfoBox } from './infoBox';
import { PagesRouter } from './pagesRouter/PagesRouter';
import { LibraryHeader } from './LibraryHeader/LibraryHeader';
import { StudioHeading } from '@studio/components';
import type { PageName } from '../types/PageName';

type ContentLibraryProps = {
  pages: PagesConfig;
};

export const ContentLibrary = ({ pages }: ContentLibraryProps): React.ReactElement => {
  const { currentPage } = useRouterContext();
  const router = new RouterRouteMapperImpl(pages);

  const Component = router.configuredRoutes.get(currentPage ?? 'landingPage')?.implementation;
  if (!Component) return <StudioHeading>404 Page Not Found</StudioHeading>; // Show the NotFound page from app-dev instead

  const componentProps = pages[currentPage]?.props;

  const infoBoxData = router.configuredRoutes.get(currentPage)?.infoBox;

  return (
    <div className={classes.libraryBackground}>
      <div className={classes.libraryContainer}>
        <LibraryHeader />
        <div className={classes.libraryContent}>
          <PagesRouter pages={pages} />
          <div className={classes.component}>
            <Component {...componentProps} />
          </div>
          {infoBoxData && (
            <InfoBox
              titleTextKey={infoBoxData.titleTextKey}
              descriptionTextKey={infoBoxData.descriptionTextKey}
              illustrationReference={infoBoxData.illustrationReference}
            />
          )}
        </div>
      </div>
    </div>
  );
};
