import type { PageName } from '../../types/PageName';

export const pageRouterQueryParamKey: string = 'currentLibraryRoute';

export interface QueryParamsRouter {
  currentRoute: PageName;
  navigate: (queryParam: string) => void;
}

export class QueryParamsRouterImpl implements QueryParamsRouter {
  private static instance: QueryParamsRouterImpl;

  private constructor() {}

  public static getInstance(): QueryParamsRouterImpl {
    if (!QueryParamsRouterImpl.instance) {
      QueryParamsRouterImpl.instance = new QueryParamsRouterImpl();
    }

    return QueryParamsRouterImpl.instance;
  }

  public get currentRoute(): PageName {
    const searchParams = new URLSearchParams(window.location.search);
    return (searchParams.get(pageRouterQueryParamKey) as PageName) ?? 'landingPage';
  }

  public navigate(queryParam: string): void {
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.set(pageRouterQueryParamKey, queryParam);
    window.history.pushState(null, '', `?${searchParams.toString()}`);
  }
}
