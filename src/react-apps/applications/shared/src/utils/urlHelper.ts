/* tslint:disable: max-line-length */
const altinnWindow = window as any;
const { org, service } = altinnWindow;
const origin = window.location.origin;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${service}`;
};

export const altinnAppsIllustrationHelpCircleSvgUrl = 'https://altinncdn.no/altinn-apps/img/illustration-help-circle.svg';
export const altinnAppsImgLogoBlueSvgUrl = 'http://altinncdn.no/altinn-apps/img/a-logo-blue.svg';
export const altinnImgLogoHeaderUrl = 'https://altinncdn.no/img/altinn_logo_header.png';
export const altinnDocsUrl = 'http://docs.altinn.studio/';
export const dataModelUploadPageUrl = `${origin}/designer/${org}/${service}#/datamodel`;
export const dataModelXsdUrl = `${origin}/designer/${org}/${service}/Model/GetXsd`;
export const repositoryGitUrl = `${origin}/repos/${org}/${service}.git`;
export const repositoryUrl =  `${origin}/repos/${org}/${service}`;
