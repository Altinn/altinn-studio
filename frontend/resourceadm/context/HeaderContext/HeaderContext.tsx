import React from 'react';
import { type Organization } from 'app-shared/types/Organization';
import { type User } from 'app-shared/types/Repository';

export enum SelectedContextType {
  All = 'all',
  Self = 'self',
  None = 'none',
}

export type HeaderContextType = {
  selectableOrgs?: Organization[];
  user: User;
};

export const HeaderContext = React.createContext<HeaderContextType>({
  selectableOrgs: undefined,
  user: undefined,
});
