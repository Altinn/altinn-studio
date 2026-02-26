export const altinnAppsIllustrationHelpCircleSvgUrl = 'https://altinncdn.no/img/illustration-help-circle.svg';

const prodStagingRegex = /^\w+\.apps\.((\w+\.)?altinn\.(no|cloud))$/;
const localRegex = /^local\.altinn\.cloud(:\d+)?$/;

export function isLocalEnvironment(host: string): boolean {
  return localRegex.test(host);
}

function extractAltinnHost(host: string): string | undefined {
  const match = host.match(prodStagingRegex);
  return match?.[1];
}

function isProductionEnvironment(altinnHost: string): boolean {
  return altinnHost === 'altinn.no';
}

function buildArbeidsflateUrl(altinnHost: string): string {
  if (isProductionEnvironment(altinnHost)) {
    return 'https://af.altinn.no/';
  }

  return `https://af.${altinnHost}/`;
}

function redirectAndChangeParty(goTo: string, partyId: number): string {
  return `ui/Reportee/ChangeReporteeAndRedirect?goTo=${encodeURIComponent(goTo)}&R=${partyId}`;
}

export const returnBaseUrlToAltinn = (host: string): string | undefined => {
  const altinnHost = extractAltinnHost(host);
  if (!altinnHost) {
    return undefined;
  }
  return `https://${altinnHost}/`;
};

function buildArbeidsflateRedirectUrl(host: string, partyId?: number, dialogId?: string): string | undefined {
  if (isLocalEnvironment(host)) {
    return `http://${host}/`;
  }

  const baseUrl = returnBaseUrlToAltinn(host);
  const altinnHost = extractAltinnHost(host);
  if (!baseUrl || !altinnHost) {
    return undefined;
  }

  const arbeidsflateUrl = buildArbeidsflateUrl(altinnHost);
  const targetUrl = dialogId ? `${arbeidsflateUrl.replace(/\/$/, '')}/inbox/${dialogId}` : arbeidsflateUrl;

  if (partyId === undefined) {
    return targetUrl;
  }

  // Use A2 redirect mechanism with A3 arbeidsflate URL to maintain party context
  return `${baseUrl}${redirectAndChangeParty(targetUrl, partyId)}`;
}

export const getMessageBoxUrl = (partyId?: number, dialogId?: string): string | undefined =>
  buildArbeidsflateRedirectUrl(window.location.host, partyId, dialogId);

export function getDialogIdFromDataValues(dataValues: unknown): string | undefined {
  const data = dataValues as Record<string, unknown> | null | undefined;
  const id = data?.['dialog.id'];
  if (typeof id === 'string') {
    return id;
  }
  if (typeof id === 'number') {
    return String(id);
  }
  return undefined;
}

export const returnUrlToArchive = (host: string, partyId?: number, dialogId?: string): string | undefined =>
  buildArbeidsflateRedirectUrl(host, partyId, dialogId);

export const returnUrlToProfile = (host: string, _partyId?: number | undefined): string | undefined => {
  if (isLocalEnvironment(host)) {
    return `http://${host}/profile`;
  }

  const altinnHost = extractAltinnHost(host);
  if (!altinnHost) {
    return undefined;
  }

  const arbeidsflateUrl = buildArbeidsflateUrl(altinnHost);
  return `${arbeidsflateUrl.replace(/\/$/, '')}/profile`;
};

export const returnUrlToAllForms = (host: string): string | undefined => {
  if (host.match(localRegex)) {
    return `http://${host}/`;
  }

  const baseUrl = returnBaseUrlToAltinn(host);
  if (!baseUrl) {
    return;
  }
  return `${baseUrl}skjemaoversikt`;
};

export function logoutUrlAltinn(host: string): string | undefined {
  if (host.match(localRegex)) {
    return `http://${host}/`;
  }

  const baseUrl = returnBaseUrlToAltinn(host);
  if (!baseUrl) {
    return;
  }
  return `${baseUrl}ui/authentication/LogOut`;
}

export function customEncodeURI(uri: string): string {
  let result: string;
  result = encodeURIComponent(uri);
  result = result.replace(/[/(]/gi, '%28').replace(/[/)]/gi, '%29');
  return result;
}

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
