import React from 'react';
import type { PageName } from '../../../types/PageName';
import { StudioContentMenu } from '@studio/components';
import type { ContentLibraryConfig } from '../../../types/ContentLibraryConfig';
import type { Page } from '../../../pages/Page';
import { pages } from '../../../pages';

type PagesRouterProps = {
  config: ContentLibraryConfig;
};

export function PagesRouter({ config }: PagesRouterProps): React.ReactElement {
  const { navigate, location, renderLink } = config.router;

  return (
    <StudioContentMenu selectedTabId={location} onChangeTab={navigate}>
      {configuredPages(config).map((page) => page.renderTab(renderLink))}
    </StudioContentMenu>
  );
}

function configuredPages(config: ContentLibraryConfig): Page<PageName>[] {
  return Object.values(pages).filter((page) => page.isConfigured(config));
}
