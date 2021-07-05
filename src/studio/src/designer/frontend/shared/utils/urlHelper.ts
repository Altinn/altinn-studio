import getNamesFromLocation from "./getNamesFromLocation";

export const sharedUrls = () => {
  const [org, repo] = getNamesFromLocation();
  const origin = window.location.origin;
  const cdn = 'https://altinncdn.no';
  const designerApi = `${origin}/designer/api`;
  const dataModelsApi = `${designerApi}/${org}/${repo}/datamodels`;
  return {
    dataModelsApi,
    applicationMetadataUrl: `${origin}/designer/api/v1/${org}/${repo}`,
    dataModelsMetadataUrl: `${origin}/designer/api/${org}/${repo}/datamodels`,
    altinnAppsIllustrationHelpCircleSvgUrl: `${cdn}/img/illustration-help-circle.svg`,
    altinnAppsImgLogoBlueSvgUrl: `${cdn}/img/a-logo-blue.svg`,
    altinnDocsUrl: 'https://docs.altinn.studio/',
    altinnStudioDocsUrl: 'https://altinn.github.io/docs/altinn-studio/',
    altinnImgLogoHeaderUrl: `${cdn}/img/altinn_logo_header.png`,
    dataModelUploadPageUrl: `${origin}/designer/${org}/${repo}#/datamodel`,
    dataModelXsdUrl: `${origin}/designer/${org}/${repo}/Model/GetXsd`,
    orgsListUrl: `${cdn}/orgs/altinn-orgs.json`,
    repositoryGitUrl: `${origin}/repos/${org}/${repo}.git`,
    repositoryUrl: `${origin}/repos/${org}/${repo}`,
    createDataModellingUrl:
      (pathToModelFile: string) => `${dataModelsApi}?modelPath=${encodeURIComponent(pathToModelFile)}`,
  };
};

export const returnUrlToMessagebox = (url: string): string => {
  const [org, repo] = getNamesFromLocation();
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
