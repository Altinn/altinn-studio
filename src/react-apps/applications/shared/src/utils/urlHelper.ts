/* tslint:disable: max-line-length */
const altinnWindow = window as any;
const { org, service } = altinnWindow;
const origin = window.location.origin;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${service}`;
};

export const altinnAppsIllustrationHelpCircleSvgUrl = 'https://altinncdn.no/altinn-apps/img/illustration-help-circle.svg';
export const altinnAppsImgLogoBlueSvgUrl = 'http://altinncdn.no/altinn-apps/img/a-logo-blue.svg';
export const altinnDocsUrl = 'http://docs.altinn.studio/';
export const altinnImgLogoHeaderUrl = 'https://altinncdn.no/img/altinn_logo_header.png';
export const dataModelUploadPageUrl = `${origin}/designer/${org}/${service}#/datamodel`;
export const dataModelXsdUrl = `${origin}/designer/${org}/${service}/Model/GetXsd`;
export const orgsListUrl: string = 'https://altinncdn.no/orgs/altinn-orgs.json';
export const repositoryGitUrl = `${origin}/repos/${org}/${service}.git`;
export const repositoryUrl =  `${origin}/repos/${org}/${service}`;
export const baseHostnameAltinnProd = 'altinn.no';
export const baseHostnameAltinnTest = 'altinn.cloud';
export const baseHostnameAltinnStudio = 'altinn3.no';
export const pathToMessageBox = 'ui/messagebox';

export const returnUrlToMessagebox = (url: string): string => {
  const prodRegex = new RegExp(baseHostnameAltinnProd);
  const testRegex = new RegExp(baseHostnameAltinnTest);
  const studioRegex = new RegExp(baseHostnameAltinnStudio);
  let result: string;

  if (url.search(prodRegex) >= 0) {

    result = `https://${baseHostnameAltinnProd}/${pathToMessageBox}`;

  } else if (url.search(testRegex) >= 0) {

    const split = url.split('.');
    const env = split[split.length - 3];
    result = `https://${env}.${baseHostnameAltinnTest}/${pathToMessageBox}`;

  } else if (url.search(studioRegex) >= 0) {

    result = `http://${baseHostnameAltinnStudio}/designer/${org}/${service}#/test`;

  } else {
    result = null;
  }

  return result;
};
