import { createContext } from 'react';
import { type Organization } from 'app-shared/types/Organization';
import { type User } from 'app-shared/types/Repository';
import { APP_DASHBOARD_BASENAME, ORG_LIBRARY_BASENAME } from 'app-shared/constants';

export enum Subroute {
  AppDashboard = APP_DASHBOARD_BASENAME,
  OrgLibrary = ORG_LIBRARY_BASENAME,
}

export type HeaderContextType = {
  selectableOrgs?: Organization[];
  user: User;
};

export const HeaderContext = createContext<HeaderContextType>({
  selectableOrgs: undefined,
  user: undefined,
});
