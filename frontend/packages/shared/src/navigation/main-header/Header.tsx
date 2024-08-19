import React from 'react';
import type { Organization } from '../../types/Organization';
import type { User } from '../../types/Repository';

// TODO MOVE
export interface IHeaderContext {
  selectableOrgs?: Organization[];
  user: User;
}

// TODO MOVE AND SEPARATE - ONE FOR DASHBOARD AND ONE FOR RESOURCEADM??
export const HeaderContext = React.createContext<IHeaderContext>({
  selectableOrgs: undefined,
  user: undefined,
});

// TODO MOVE
export const getOrgNameByUsername = (username: string, orgs: Organization[]) => {
  const org = orgs?.find((o) => o.username === username);
  return org?.full_name || org?.username;
};

// TODO MOVE
export const getOrgUsernameByUsername = (username: string, orgs: Organization[]) => {
  const org = orgs?.find((o) => o.username === username);
  return org?.username;
};
