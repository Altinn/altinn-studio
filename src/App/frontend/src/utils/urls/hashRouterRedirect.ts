const HASH_ROUTE_PREFIX = '#/';

interface LocationLike {
  hash: string;
  search: string;
  replace(url: string): void;
}

export class HashRouterRedirect {
  private readonly location: LocationLike;
  private readonly org: string;
  private readonly app: string;

  constructor(location: LocationLike, org: string, app: string) {
    this.location = location;
    this.org = org;
    this.app = app;
  }

  public execute(): boolean {
    if (!this.hasHashRoute()) {
      return false;
    }
    this.location.replace(this.buildBrowserUrl());
    return true;
  }

  public hasHashRoute(): boolean {
    return this.location.hash?.startsWith(HASH_ROUTE_PREFIX);
  }

  public buildBrowserUrl(): string {
    const basePath = `/${this.org}/${this.app}`;
    const { path, queryString } = this.parseHash();
    return queryString ? `${basePath}/${path}?${queryString}` : `${basePath}/${path}`;
  }

  private parseHash(): { path: string; queryString: string } {
    const hashContent = this.location.hash.slice(HASH_ROUTE_PREFIX.length);
    const queryIndex = hashContent.indexOf('?');
    const hasQuery = queryIndex !== -1;

    const path = hasQuery ? hashContent.slice(0, queryIndex) : hashContent;
    const queryString = this.buildCombinedQueryString(hasQuery ? hashContent.slice(queryIndex + 1) : '');

    return { path, queryString };
  }

  private buildCombinedQueryString(hashQueryString: string): string {
    const params = new URLSearchParams(this.location.search);
    new URLSearchParams(hashQueryString).forEach((value, key) => params.set(key, value));
    return params.toString();
  }
}

export function executeHashRouterRedirect(): boolean {
  return new HashRouterRedirect(window.location, window.org, window.app).execute();
}
