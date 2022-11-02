import type { IAltinnOrgs } from 'altinn-shared/types';

export interface IOrgsState {
  allOrgs: IAltinnOrgs | null;
  error: Error | null;
}

export interface IFetchOrgsFulfilled {
  orgs: IAltinnOrgs;
}

export interface IFetchOrgsRejected {
  error: Error;
}
