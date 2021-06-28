/* tslint:disable: max-line-length */
const altinnWindow = window as any;
const { org, app } = altinnWindow;
const origin = window.location.origin;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${app}`;
};

export const altinnAppsIllustrationHelpCircleSvgUrl = 'https://altinncdn.no/img/illustration-help-circle.svg';
export const altinnAppsImgLogoBlueSvgUrl = 'https://altinncdn.no/img/Altinn-logo-blue.svg';
export const altinnDocsUrl = 'http://docs.altinn.studio/';
export const altinnStudioDocsUrl = 'https://altinn.github.io/docs/altinn-studio/';
export const altinnImgLogoHeaderUrl = 'https://altinncdn.no/img/Altinn-logo-blue.svg';
export const dataModelUploadPageUrl = `${origin}/designer/${org}/${app}#/datamodel`;
export const dataModelXsdUrl = `${origin}/designer/${org}/${app}/Model/GetXsd`;
export const orgsListUrl: string = 'https://altinncdn.no/orgs/altinn-orgs.json';
export const repositoryGitUrl = `${origin}/repos/${org}/${app}.git`;
export const repositoryUrl = `${origin}/repos/${org}/${app}`;
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
    result = `http://${baseHostnameAltinnStudio}/designer/${org}/${app}#/test`;
  } else {
    result = null;
  }

  return result;
};
