const altinnWindow = window as any;
const { org, repo } = altinnWindow;
const origin = window.location.origin;
const cdn = 'https://altinncdn.no';

export const applicationMetadataUrl = `${origin}/designer/api/v1/${org}/${repo}`;
export const datamodelsMetadataUrl = `${origin}/designer/api/${org}/${repo}/datamodels`;
export const altinnAppsIllustrationHelpCircleSvgUrl = `${cdn}/img/illustration-help-circle.svg`;
export const altinnAppsImgLogoBlueSvgUrl = `${cdn}/img/a-logo-blue.svg`;
export const altinnDocsUrl = 'https://docs.altinn.studio/';
export const altinnStudioDocsUrl = 'https://altinn.github.io/docs/altinn-studio/';
export const altinnImgLogoHeaderUrl = `${cdn}/img/altinn_logo_header.png`;
export const dataModelUploadPageUrl = `${origin}/designer/${org}/${repo}#/datamodel`;
export const dataModelXsdUrl = `${origin}/designer/${org}/${repo}/Model/GetXsd`;
export const orgsListUrl = `${cdn}/orgs/altinn-orgs.json`;
export const repositoryGitUrl = `${origin}/repos/${org}/${repo}.git`;
export const repositoryUrl = `${origin}/repos/${org}/${repo}`;

export const returnUrlToMessagebox = (url: string): string => {
  const baseHostnameAltinnProd = 'altinn.no';
  const baseHostnameAltinnTest = 'altinn.cloud';
  const baseHostnameAltinnStudio = 'altinn3.no';
  const pathToMessageBox = 'ui/messagebox';
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
    result = `http://${baseHostnameAltinnStudio}/designer/${org}/${repo}#/test`;
  } else {
    result = null;
  }

  return result;
};
