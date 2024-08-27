export const altinnAppsIllustrationHelpCircleSvgUrl = 'https://altinncdn.no/img/illustration-help-circle.svg';
export const orgsListUrl = 'https://altinncdn.no/orgs/altinn-orgs.json';
export const baseHostnameAltinnProd = 'altinn.no';
export const baseHostnameAltinnTest = 'altinn.cloud';
export const baseHostnameAltinnLocal = 'altinn3local.no';
export const pathToMessageBox = 'ui/messagebox';
export const pathToArchive = 'ui/messagebox/archive';
export const pathToProfile = 'ui/profile';
export const pathToAllSchemas = 'skjemaoversikt';

const prodRegex = new RegExp(baseHostnameAltinnProd);
const testRegex = new RegExp(baseHostnameAltinnTest);
const localRegex = new RegExp(baseHostnameAltinnLocal);

export const returnUrlToMessagebox = (url: string, partyId?: number | undefined): string | null => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  if (partyId === undefined) {
    return baseUrl + pathToMessageBox;
  }

  return `${baseUrl}ui/Reportee/ChangeReporteeAndRedirect?goTo=${baseUrl}${pathToMessageBox}&R=${partyId}`;
};

export const returnUrlToArchive = (url: string): string | null => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  return baseUrl + pathToArchive;
};

export const returnUrlToProfile = (url: string, partyId?: number | undefined): string | null => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  if (partyId === undefined) {
    return baseUrl + pathToProfile;
  }

  return `${baseUrl}ui/Reportee/ChangeReporteeAndRedirect?goTo=${baseUrl}${pathToProfile}&R=${partyId}`;
};

export const returnUrlToAllSchemas = (url: string): string | null => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }
  return baseUrl + pathToAllSchemas;
};

export const returnBaseUrlToAltinn = (url: string): string | null => {
  const sanitizedUrl = url.replace('http://', '').replace('https://', '');

  const isProd = sanitizedUrl.search(prodRegex) >= 0;
  if (isProd) {
    const split = sanitizedUrl.split('.');
    const env = split[split.length - 3];

    return env === 'tt02' ? `https://${env}.${baseHostnameAltinnProd}/` : `https://${baseHostnameAltinnProd}/`;
  }

  const isTest = sanitizedUrl.search(testRegex) >= 0;
  if (isTest) {
    const env = sanitizedUrl.split('.').at(-3);
    return `https://${env}.${baseHostnameAltinnTest}/`;
  }

  const isLocal = sanitizedUrl.search(localRegex) >= 0;
  return isLocal ? `https://${baseHostnameAltinnLocal}/` : null;
};

export function customEncodeURI(uri: string): string {
  let result: string;
  result = encodeURIComponent(uri);
  result = result.replace(/[/(]/gi, '%28').replace(/[/)]/gi, '%29');
  return result;
}

export const logoutUrlAltinn = (url: string): string => `${returnBaseUrlToAltinn(url)}ui/authentication/LogOut`;

// Storage is always returning https:// links for attachments.
// on localhost (without https) this is a problem, so we make links
// to the same domain as window.location.host relative.
// "https://domain.com/a/b" => "/a/b"
export const makeUrlRelativeIfSameDomain = (url: string, location: Location = window.location) => {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === location.hostname) {
      return parsed.pathname + parsed.search + parsed.hash;
    }
  } catch (_err) {
    //ignore invalid (or dummy) urls
  }
  return url;
};

function entryHasValue(entry: [string, string | null | undefined]): entry is [string, string] {
  return !!entry[1];
}

/**
 * Returns an encoded query string from a key-value object, or an empty string if the object is empty.
 * Also removes parameters that are empty, null, or undefined.
 * Example: { a: 'b', c: 'd' } => '?a=b&c=d'
 * Example: {} => ''
 * Example: { a: 'b', c: null } => '?a=b'
 */
export function getQueryStringFromObject(obj: Record<string, string | null | undefined>): string {
  const cleanObj = Object.fromEntries(Object.entries(obj).filter(entryHasValue));
  const queryParams = new URLSearchParams(cleanObj);
  const queryString = queryParams.toString();
  return queryString ? `?${queryString}` : '';
}

export function getUrlWithLanguage<T extends string | undefined, R = T extends string ? string : undefined>(
  url: T,
  language: string | undefined,
): R {
  if (typeof url === 'undefined') {
    return undefined as R;
  }
  const urlObj = new URL(url);
  if (typeof language === 'string') {
    urlObj.searchParams.set('language', language);
  } else {
    urlObj.searchParams.delete('language');
  }
  return urlObj.toString() as R;
}
