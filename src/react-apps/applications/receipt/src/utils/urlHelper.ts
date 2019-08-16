import { getInstanceId, getInstanceOwnerId } from './instance';
import { getUserID } from './profile';

export const altinnAt21CloudUrl = 'http://platform.at21.altinn.cloud/';
export const altinnUrl = 'http://altinn.no/';

export function getInstanceMetadataUrl(): string {
  if (window.location.hostname === 'localhost') {
    // if we are developing locally, point to test data in at21 for now
    return `${altinnAt21CloudUrl}storage/api/v1/instances/${getInstanceOwnerId()}/${getInstanceId()}`;
  } else {
    // in "prod" => point to origin. Can be multiple environments.
    return `${window.location.origin}/storage/api/v1/instances/${getInstanceOwnerId()}/${getInstanceId()}`;
  }
}

export function getProfileUrl(): string {
  if (window.location.hostname === 'localhost') {
    // if we are running locally, point to at21 for now
    return `${altinnAt21CloudUrl}profile/api/v1/users/${getUserID()}`;
  } else {
    // in prod => point to origin. Can be multiple environments.
    return `${window.location.origin}/profile/api/v1/users/${getUserID()}`;
  }
}

export function getUrlQueryParameterByKey(key: string): string {
    const match = RegExp('[?&]' + key + '=([^&]*)').exec(window.location.search);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
}
