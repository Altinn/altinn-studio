import { createContext, useContext } from 'react';
import type { Organization } from 'app-shared/types/Organization';

export const OrgContext = createContext<Organization | null>(null);

export function useCurrentOrg(): Organization {
  const org = useContext(OrgContext);
  if (!org) {
    throw new Error('Current org is not defined');
  }
  return org;
}
