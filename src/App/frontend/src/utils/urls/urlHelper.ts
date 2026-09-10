import { GlobalData } from 'src/GlobalData';

const prodStagingRegex = /^\w+\.apps\.((\w+\.)?altinn\.(no|cloud))$/;
const localRegex = /^local\.altinn\.cloud(:\d+)?$/;

/** Whole URLs live in config so a changed route structure doesn't require a new app frontend release. */
export function fillUrlTemplate(
  template: string | undefined,
  values: Record<string, string | number> = {},
): string | undefined {
  return Object.entries(values).reduce(
    (url, [name, value]) => url?.replaceAll(`{${name}}`, encodeURIComponent(String(value))),
    template,
  );
}

export function isLocalEnvironment(host: string): boolean {
  return localRegex.test(host);
}

function extractAltinnHost(host: string): string | undefined {
  const match = host.match(prodStagingRegex);
  return match?.[1];
}

/**
 * A host we do not recognize never gets an arbeidsflate link, even if the configuration happens to
 * hold one. In practice the configuration only reaches apps deployed on these hosts, so this is a
 * guard rather than a decision — but it is the guard the tests for Studio and unknown hosts rely on.
 */
function isRecognizedAltinnHost(host: string): boolean {
  return extractAltinnHost(host) !== undefined;
}

export const returnBaseUrlToAltinn = (host: string): string | undefined => {
  const altinnHost = extractAltinnHost(host);
  if (!altinnHost) {
    return undefined;
  }
  return `https://${altinnHost}/`;
};

/**
 * A locally running app must never be sent to a deployed arbeidsflate: the session, the parties and
 * the dialogs all live in the local stack, so such a link would land the user in a place where their
 * work does not exist. Locally configured URLs are therefore honoured only when they point somewhere
 * local themselves — which is what a locally running arbeidsflate configures them to.
 */
function isLocalTarget(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === 'localhost' || hostname.endsWith('.localhost') || hostname === 'local.altinn.cloud';
  } catch {
    return false;
  }
}

function buildArbeidsflateRedirectUrl(
  host: string,
  partyId?: number,
  dialogId?: string,
  pid?: string | null,
): string | undefined {
  const settings = GlobalData.platformFrontendSettings;

  if (isLocalEnvironment(host)) {
    // Access management is not deployed locally, so there is no party to switch through. The local
    // arbeidsflate instead accepts the party identifier straight in the URL, which lets it show the
    // inbox of whichever test user is filling out the form. Only ever substituted for local targets,
    // so an identifier cannot leak into a deployed URL.
    const localTarget =
      (dialogId && fillUrlTemplate(settings.arbeidsflateDialogUrl, { dialogId, pid: pid ?? '' })) ||
      settings.arbeidsflateInboxUrl;
    return localTarget && isLocalTarget(localTarget) ? localTarget : `http://${host}/`;
  }

  if (!isRecognizedAltinnHost(host)) {
    return undefined;
  }

  const inboxUrl = settings.arbeidsflateInboxUrl;
  if (!inboxUrl) {
    return undefined;
  }

  const targetUrl = (dialogId && fillUrlTemplate(settings.arbeidsflateDialogUrl, { dialogId })) || inboxUrl;
  if (partyId === undefined) {
    return targetUrl;
  }

  // Use access management changeandredirect endpoint to switch party and redirect to A3 arbeidsflate
  return fillUrlTemplate(settings.accessManagementChangeAndRedirectUrl, { partyId, goTo: targetUrl }) ?? targetUrl;
}

export const getMessageBoxUrl = (partyId?: number, dialogId?: string, pid?: string | null): string | undefined =>
  buildArbeidsflateRedirectUrl(window.location.host, partyId, dialogId, pid);

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

export const returnUrlToArchive = (
  host: string,
  partyId?: number,
  dialogId?: string,
  pid?: string | null,
): string | undefined => buildArbeidsflateRedirectUrl(host, partyId, dialogId, pid);

export const returnUrlToProfile = (host: string, _partyId?: number | undefined): string | undefined => {
  if (isLocalEnvironment(host)) {
    // localtest serves no profile page, so its front page is the closest equivalent
    return `http://${host}/`;
  }
  if (!isRecognizedAltinnHost(host)) {
    return undefined;
  }

  return GlobalData.platformFrontendSettings.arbeidsflateProfileUrl;
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
  if (isLocalEnvironment(host)) {
    return `http://${host}/`;
  }

  if (!isRecognizedAltinnHost(host)) {
    return;
  }
  return GlobalData.platformFrontendSettings.logoutUrl;
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
