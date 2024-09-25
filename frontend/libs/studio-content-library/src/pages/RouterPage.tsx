import React from 'react';
import { useRouterContext } from '../contexts/RouterContext';
import { RouterRouteMapperImpl } from '../utils/router/RouterRouteMapper';
import type { PageConfig } from '../types/PagesProps';

type RouterPageProps = {
  pages: PageConfig;
};

export const RouterPage = ({ pages }: RouterPageProps): React.ReactElement => {
  const { currentPage } = useRouterContext();
  const router = new RouterRouteMapperImpl(pages);

  const Component = router.configuredRoutes.get(currentPage);
  if (!Component) return <h1>404 Page Not Found</h1>;

  const componentProps = pages[currentPage].props;
  return <Component {...componentProps} />;
};
