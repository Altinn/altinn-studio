import { RouteObject } from 'react-router-dom';
import { CodeListsPageProps } from '../pages/CodeLists/CodeListsPage';

type AvailableProps = CodeListsPageProps | undefined;

type ConfigurableProperties = {
  shouldDisplayRoute?: boolean;
  props: AvailableProps;
};

type Routes = 'root' | 'codeList';
type ConfigurableRoutes = Record<Routes, ConfigurableProperties>;

export const getConfigurableRoutes = (config: ConfigurableProperties): ConfigurableRoutes => {
  return {
    root: {
      shouldDisplayRoute: config.shouldDisplayRoute,
      props: config.props as undefined,
    },
    codeList: {
      shouldDisplayRoute: config.shouldDisplayRoute,
      props: config.props as CodeListsPageProps,
    },
  };
};

type RouterRoute = RouteObject & ConfigurableProperties;

export type RouterConfig = {
  basename?: string;
  routes: Array<RouterRoute>;
};

export class RouterRouteConfig {
  constructor(public routerConfig: RouterConfig) {}

  public configRoutes(config: ConfigurableProperties): ConfigurableRoutes {
    return getConfigurableRoutes(config);
  }

  public getAvailableRoutes(): Array<RouterRoute> {
    return this.routerConfig.routes.filter(
      (route) => route.shouldDisplayRoute,
    ) satisfies Array<RouteObject>;
  }

  public getRouterBasename(): string | undefined {
    return this.routerConfig.basename;
  }
}
