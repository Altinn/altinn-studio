import React from 'react';
import { useRouterContext } from '../../../contexts/RouterContext';
import type { PageName } from '../../../types/PageName';
import { useContentTabs } from '../../../hooks/useLibraryMenuContentTabs';
import { StudioContentMenu } from '@studio/components';

type PagesRouterProps = {
  pageNames: PageName[];
};

export function PagesRouter({ pageNames }: PagesRouterProps): React.ReactElement {
  const { navigate, currentPage } = useRouterContext();
  const contentTabs = useContentTabs();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  return (
    <StudioContentMenu selectedTabId={currentPage} onChangeTab={handleNavigation}>
      {pageNames.map((pageName) => (
        <StudioContentMenu.LinkTab
          key={contentTabs[pageName].tabId}
          icon={contentTabs[pageName].icon}
          tabId={contentTabs[pageName].tabId}
          tabName={contentTabs[pageName].tabName}
          renderTab={contentTabs[pageName].renderTab}
        />
      ))}
    </StudioContentMenu>
  );
}
