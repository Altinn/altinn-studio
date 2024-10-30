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
  const { getContentTabs } = useContentTabs();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  return (
    <StudioContentMenu selectedTabId={currentPage} onChangeTab={handleNavigation}>
      {pageNames.map((pageName) => (
        <StudioContentMenu.LinkTab
          key={getContentTabs()[pageName].tabId}
          icon={getContentTabs()[pageName].icon}
          tabId={getContentTabs()[pageName].tabId}
          tabName={getContentTabs()[pageName].tabName}
          renderTab={getContentTabs()[pageName].renderTab}
        />
      ))}
    </StudioContentMenu>
  );
}
