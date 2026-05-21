import type { OrgList } from 'app-shared/types/OrgList';

export const isServiceOwnerOrg = (orgs: OrgList['orgs'], org?: string): boolean =>
  !!org && Object.hasOwn(orgs, org);
