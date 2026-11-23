import { GlobalData } from 'src/GlobalData';

const localtestHostName = /^local\.altinn\.cloud$/;
const devHostNames = [localtestHostName, /^\S+\.apps\.tt02\.altinn\.no$/];

let isDevCache: boolean | null = null;

/**
 * Indicates whether the application runs where its developers test it, such as LocalTest, TT02 or Altinn Studio's
 * preview. The environment says so in its platform settings, and where it doesn't, the host names of LocalTest and
 * TT02 do.
 */
export function isDev(): boolean {
  if (isDevCache !== null && !window.inUnitTest) {
    return isDevCache;
  }
  isDevCache = GlobalData.platformFrontendSettings?.development ?? isLocalOrStaging();
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
