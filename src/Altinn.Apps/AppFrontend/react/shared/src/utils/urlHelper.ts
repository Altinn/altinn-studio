/* tslint:disable: max-line-length */
const altinnWindow = window as any;
const { org, app } = altinnWindow;
const origin = window.location.origin;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${app}`;
};

export const altinnAppsIllustrationHelpCircleSvgUrl = 'https://altinncdn.no/img/illustration-help-circle.svg';
export const altinnAppsImgLogoBlueSvgUrl = 'http://altinncdn.no/img/a-logo-blue.svg';
export const altinnDocsUrl = 'http://docs.altinn.studio/';
export const altinnStudioDocsUrl = 'https://altinn.github.io/docs/altinn-studio/';
export const altinnImgLogoHeaderUrl = 'https://altinncdn.no/img/altinn_logo_header.png';
export const dataModelUploadPageUrl = `${origin}/designer/${org}/${app}#/datamodel`;
export const dataModelXsdUrl = `${origin}/designer/${org}/${app}/Model/GetXsd`;
export const orgsListUrl: string = 'https://altinncdn.no/orgs/altinn-orgs.json';
export const repositoryGitUrl = `${origin}/repos/${org}/${app}.git`;
export const repositoryUrl = `${origin}/repos/${org}/${app}`;
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

export const returnUrlToMessagebox = (url: string, partyId?: string | undefined): string => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  if (partyId === undefined) {
    return baseUrl + pathToMessageBox;
  }

  return `${baseUrl}ui/Reportee/ChangeReporteeAndRedirect?goTo=${baseUrl}${pathToMessageBox}&R=${partyId}`;
};

export const returnUrlToArchive = (url: string): string => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  return baseUrl + pathToArchive;
};

export const returnUrlToProfile = (url: string, partyId?: string | undefined): string => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }

  if (partyId === undefined) {
    return baseUrl + pathToProfile;
  }

  return `${baseUrl}ui/Reportee/ChangeReporteeAndRedirect?goTo=${baseUrl}${pathToProfile}&R=${partyId}`;
};

export const returnUrlToAllSchemas = (url: string): string => {
  const baseUrl = returnBaseUrlToAltinn(url);
  if (!baseUrl) {
    return null;
  }
  return baseUrl + pathToAllSchemas;
};

export const returnBaseUrlToAltinn = (url: string): string => {
  let result: string;
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

export const logoutUrlAltinn = (url: string): string => {
  return `${returnBaseUrlToAltinn(url)}ui/authentication/LogOut`;
};
