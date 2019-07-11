/* tslint:disable: max-line-length */
const altinnWindow = window as IAltinnWindow;
const { origin, org, service } = altinnWindow;

export const getApplicationMetadataUrl = (): string => {
  return `${origin}/designer/api/v1/${org}/${service}`;
};

export const altinnAppsIllustrationHelpCircleSvgUrl = 'https://altinncdn.no/altinn-apps/img/illustration-help-circle.svg';
