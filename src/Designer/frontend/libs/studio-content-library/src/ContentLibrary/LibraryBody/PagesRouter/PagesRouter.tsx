import React from 'react';
import { useRouterContext } from '../../../contexts/RouterContext';
import type { PageName } from '../../../types/PageName';
import { StudioContentMenu } from '@studio/components-legacy';
import type { ContentLibraryConfig } from '../../../types/ContentLibraryConfig';
import type { Page } from '../../../pages/Page';
import { pages } from '../../../pages';

type PagesRouterProps = {
  config: ContentLibraryConfig;
};

export function PagesRouter({ config }: PagesRouterProps): React.ReactElement {
  const { navigate, currentPage } = useRouterContext();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  return (
    <StudioContentMenu selectedTabId={currentPage} onChangeTab={handleNavigation}>
      {configuredPages(config).map((page) => page.renderTab())}
    </StudioContentMenu>
  );
}

function configuredPages(config: ContentLibraryConfig): Page<PageName>[] {
  return Object.values(pages).filter((page) => page.isConfigured(config));
}
