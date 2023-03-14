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

export const returnUrlToMessagebox = (url: string, partyId?: string | undefined): string | null => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  if (partyId === undefined) {
    return baseUrl + pathToMessageBox;
  }

  return `${baseUrl}ui/Reportee/ChangeReporteeAndRedirect?goTo=${baseUrl}${pathToMessageBox}&R=${partyId}`;
};

export const returnUrlFromQueryParameter = (): string | null => {
  const params = new URLSearchParams(window.location.search);
  return params.get('returnUrl');
};

export const returnUrlToArchive = (url: string): string | null => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  return baseUrl + pathToArchive;
};

export const returnUrlToProfile = (url: string, partyId?: string | undefined): string | null => {
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
  let result: string | null;
  if (url.search(prodRegex) >= 0) {
    const split = url.split('.');
    const env = split[split.length - 3];
    if (env === 'tt02') {
      result = `https://${env}.${baseHostnameAltinnProd}/`;
    } else {
      result = `https://${baseHostnameAltinnProd}/`;
    }
  } else if (url.search(testRegex) >= 0) {
    const split = url.split('.');
    const env = split[split.length - 3];
    result = `https://${env}.${baseHostnameAltinnTest}/`;
  } else if (url.search(localRegex) >= 0) {
    result = '/';
  } else {
    result = null;
  }
  return result;
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
  } catch (e) {
    //ignore invalid (or dummy) urls
  }
  return url;
};
