import { _useParamsClassCompHack } from 'app-shared/utils/_useParamsClassCompHack';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

export const altinnDocsUrl = 'https://docs.altinn.studio/';

export const dataModelUploadPageUrl = (org, app) =>
  `${APP_DEVELOPMENT_BASENAME}/${org}/${app}/datamodel`;

export const returnUrlToMessagebox = (url: string): string => {
  const { org, app } = _useParamsClassCompHack();
  const baseHostnameAltinnProd = 'altinn.no';
  const baseHostnameAltinnTest = 'altinn.cloud';
  const baseHostnameAltinnStudio = 'altinn.localhost';
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
