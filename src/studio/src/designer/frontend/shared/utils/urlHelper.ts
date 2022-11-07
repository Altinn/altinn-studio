import conditionalPath from 'app-shared/utils/conditionalPath';
import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

const cdn = 'https://altinncdn.no';
export const altinnImgLogoHeaderUrl = `${cdn}/img/Altinn-logo-blue.svg`;
export const altinnDocsUrl = 'https://docs.altinn.studio/';

export const sharedUrls = () => {
  const { org, app } = _useParamsClassCompHack();
  const origin = window.location.origin;
  const designerApi = `${origin}/designer/api`;
  const orgRepoChunk = conditionalPath(org, app);
  const dataModelsApi = `${designerApi}/${orgRepoChunk}/datamodels`;

  return {
    ensureCloneApi: `${origin}/designer/${orgRepoChunk}`,
    dataModelsApi,
    dataModelUploadPageUrl: `${origin}${APP_DEVELOPMENT_BASENAME}/${orgRepoChunk}/datamodel`,
    dataModelXsdUrl: `${origin}/designer/${orgRepoChunk}/Model/GetXsd`,
    repositoryGitUrl: `${origin}/repos/${orgRepoChunk}.git`,
    repositoryUrl: `${origin}/repos/${orgRepoChunk}`,
    createDataModelUrl: `${dataModelsApi}/post`,
    getDataModelUrl: (pathToModelFile: string) =>
      `${dataModelsApi}${pathToModelFile}`,
    saveDataModelUrl: (pathToModelFile: string) =>
      `${dataModelsApi}?modelPath=${encodeURIComponent(pathToModelFile)}`,
  };
};

export const returnUrlToMessagebox = (url: string): string => {
  const { org, app } = _useParamsClassCompHack();
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
    result = `http://${baseHostnameAltinnStudio}/designer/${org}/${app}#/test`;
  } else {
    result = null;
  }

  return result;
};
