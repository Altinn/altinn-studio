import { createContext } from 'react';
import { type Organization } from 'app-shared/types/Organization';
import { type User } from 'app-shared/types/Repository';

export type HeaderContextType = {
  selectableOrgs?: Organization[];
  user: User;
};

export const HeaderContext = createContext<HeaderContextType>({
  selectableOrgs: undefined,
  user: undefined,
});
