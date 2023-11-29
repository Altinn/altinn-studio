import type { IAltinnOrgs } from 'src/types/shared';

export interface IOrgsState {
  allOrgs: IAltinnOrgs | null;
}

export interface IFetchOrgsFulfilled {
  orgs: IAltinnOrgs;
}
