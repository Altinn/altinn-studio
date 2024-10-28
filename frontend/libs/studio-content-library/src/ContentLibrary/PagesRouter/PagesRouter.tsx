import React from 'react';
import { useRouterContext } from '../../contexts/RouterContext';
import type { PageName } from '../../types/PageName';
import { useContentTabs } from '../../hooks/useLibraryMenuContentTabs';
import { StudioContentMenu } from '@studio/components';

type PagesRouterProps = {
  currentPage: PageName;
};

export function PagesRouter({ currentPage }: PagesRouterProps): React.ReactElement {
  const { navigate } = useRouterContext();
  const { getContentTabs } = useContentTabs();

  const handleNavigation = (pageToNavigateTo: PageName) => {
    navigate(pageToNavigateTo);
  };

  return (
    <StudioContentMenu selectedTabId={currentPage} onChangeTab={handleNavigation}>
      {getContentTabs().map((contentTab) => (
        <StudioContentMenu.LinkTab key={contentTab.tabId} contentTab={contentTab} />
      ))}
    </StudioContentMenu>
  );
}
