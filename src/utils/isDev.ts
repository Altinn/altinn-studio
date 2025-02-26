const localtestHostName = /^local\.altinn\.cloud$/;
const devHostNames = [localtestHostName, /^\S+\.apps\.tt02\.altinn\.no$/];
const studioHostNames = [/^dev\.altinn\.studio$/, /^altinn\.studio$/, /^studio\.localhost$/];

let isDevCache: boolean | null = null;

/**
 * Indicates whether the application is running in a development environment.
 * This can be either through LocalTest, altinn studio preview or TT02.
 */
export function isDev(): boolean {
  if (isDevCache !== null && !window.inUnitTest) {
    return isDevCache;
  }
  isDevCache = isLocalOrStaging() || isStudioPreview();
  return isDevCache;
}

export function isLocalTest(): boolean {
  return localtestHostName.test(window.location.hostname);
}

/**
 * Indicates whether the application is running through LocalTest or in TT02 (staging).
 */
export function isLocalOrStaging(): boolean {
  return devHostNames.some((host) => host.test(window.location.hostname));
}

/**
 * Indicates whether the application is running in Altinn Studio Preview.
 */
export function isStudioPreview(): boolean {
  return studioHostNames.some((host) => host.test(window.location.hostname));
}
