import React from 'react';
import { useRouterContext } from '../../../contexts/RouterContext';
import type { PageName } from '../../../types/PageName';
import { StudioContentMenu } from '@studio/components';
import type { ContentLibraryConfig } from '../../../types/ContentLibraryConfig';
import type { Page } from '../../../pages/Page';
import { pages } from '../../../pages';

type MenuProps = {
  config: ContentLibraryConfig;
};

export function Menu({ config }: MenuProps): React.ReactElement {
  const { navigate, currentPage } = useRouterContext();

  const handleNavigation = (pageToNavigateTo: PageName): void => {
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
