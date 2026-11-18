/**
 * The app backend reads this query parameter and loads the app frontend in that version from app-dist. It does so
 * only in development and test environments, and only for a version number, never a URL.
 */
export const frontendVersionSearchParam = 'frontendVersion';

/**
 * Lists the app frontend versions on app-dist. App-dist sends no CORS headers, so the app cannot fetch the list
 * itself, but the user can open it in a new tab.
 */
export const frontendVersionsUrl = 'https://altinn.studio/designer/app-dist/versions';

// Same rule as FrontendVersionOverride in the app backend: a version such as 9.0.0 or 9.0.0-preview.12.
const versionRegex = /^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*)?$/;
const maxVersionLength = 64;

export function isValidFrontendVersion(version: string): boolean {
  return version.length <= maxVersionLength && versionRegex.test(version);
}

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
