/**
 * The app backend reads this query parameter and loads the app frontend in that version from app-dist. It does so
 * only in development and test environments, and it validates the version itself.
 */
export const frontendVersionSearchParam = 'frontendVersion';

/** Lists the app frontend versions published on app-dist, oldest first. */
export const frontendVersionsUrl = 'https://altinn.studio/designer/app-dist/versions';

/**
 * Returns the version in the address, or an empty string. Like the backend, it uses the first value when the
 * parameter is there more than once.
 */
export function getFrontendVersionFromUrl(href: string): string {
  return new URL(href).searchParams.get(frontendVersionSearchParam) ?? '';
}

/**
 * Returns the address with the frontend version set, keeping the path, the other parameters and the hash, so the
 * page reloads where the user is.
 */
export function getUrlWithFrontendVersion(href: string, version: string): string {
  const url = new URL(href);
  url.searchParams.set(frontendVersionSearchParam, version);
  return url.toString();
}
