import getNamesFromLocation from './getNamesFromLocation';

const cdn = 'https://altinncdn.no';
export const orgsListUrl = `${cdn}/orgs/altinn-orgs.json`;
export const altinnImgLogoHeaderUrl = `${cdn}/img/Altinn-logo-blue.svg`;
export const altinnDocsUrl = 'https://docs.altinn.studio/';

export const sharedUrls = () => {
  const [org, repo] = getNamesFromLocation();
  const origin = window.location.origin;
  const designerApi = `${origin}/designer/api`;
  const dataModelsApi = `${designerApi}/${org}/${repo}/datamodels`;
  return {
    ensureCloneApi: `${origin}/designer/${org}/${repo}`,
    dataModelsApi,
    dataModelUploadPageUrl: `${origin}/designer/${org}/${repo}#/datamodel`,
    dataModelXsdUrl: `${origin}/designer/${org}/${repo}/Model/GetXsd`,
    repositoryGitUrl: `${origin}/repos/${org}/${repo}.git`,
    repositoryUrl: `${origin}/repos/${org}/${repo}`,
    createDataModelUrl: `${dataModelsApi}/post`,
    getDataModelUrl:
      (pathToModelFile: string) => `${dataModelsApi}${pathToModelFile}`,
    saveDataModelUrl:
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
