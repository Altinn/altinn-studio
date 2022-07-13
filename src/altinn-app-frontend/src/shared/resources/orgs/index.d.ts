import type { IAltinnOrgs } from 'altinn-shared/types';

export interface IOrgsState {
  allOrgs: IAltinnOrgs;
  error: Error;
}

export interface IFetchOrgsFulfilled {
  orgs: IAltinnOrgs;
}

export interface IFetchOrgsRejected {
  error: Error;
}
