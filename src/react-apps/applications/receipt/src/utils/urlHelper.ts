import { getInstanceId, getInstanceOwnerId } from './instance';

export const altinnAt21CloudUrl = 'https://platform.at21.altinn.cloud/';
export const altinnUrl = 'http://altinn.no/';
export const altinnOrganisationsUrl = 'https://altinncdn.no/orgs/altinn-orgs.json';

export function getInstanceMetadataUrl(): string {
  return `${getAltinnCloudUrl()}storage/api/v1/instances/${getInstanceOwnerId()}/${getInstanceId()}`;
}

export function getPartyUrl(): string {
  return `${getAltinnCloudUrl()}register/api/v1/parties/${getInstanceOwnerId()}`;
}

export function getAltinnCloudUrl(): string {
  if(window.location.hostname === 'localhost') {
    // if we are developing locally, point to test data in at21 for now
    return altinnAt21CloudUrl;
  } else {
    // in prod => point to origin. Can be multiple environments.
    return window.location.origin + '/';
  }
}

export function getUrlQueryParameterByKey(key: string): string {
    const match = RegExp('[?&]' + key + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}

export function getApplicationMetadataUrl(org: string, app: string): string {
  return `${getAltinnCloudUrl()}storage/api/v1/applications/${org}/${app}`;
}

export function getUserUrl(): string {
  return `${getAltinnCloudUrl()}TODO`;
}
