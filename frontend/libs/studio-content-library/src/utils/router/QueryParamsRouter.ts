import { Page } from '../../types';

interface QueryParamsRouter {
  getCurrentRoute: () => string;
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

  public getCurrentRoute(): Page {
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('currentLibraryRoute') as string as Page;
  }

  public navigate(queryParam: string) {
    const url = new URL(window.location.href);

    const searchParams = new URLSearchParams(url.search);
    searchParams.set('currentLibraryRoute', queryParam);
    window.history.pushState(null, '', `?${searchParams.toString()}`);
  }
}
