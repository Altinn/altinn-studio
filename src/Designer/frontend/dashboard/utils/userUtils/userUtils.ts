import { SelectedContextType } from '../../enums/SelectedContextType';
import type { Organization } from 'app-shared/types/Organization';

export const userHasAccessToSelectedContext = ({
  selectedContext,
  orgs,
}: {
  selectedContext: string | SelectedContextType;
  orgs: Organization[];
}): boolean => {
  if (
    selectedContext == SelectedContextType.Self ||
    selectedContext == SelectedContextType.All ||
    selectedContext == SelectedContextType.None
  ) {
    return true;
  }

  return Boolean(orgs.find((org) => org.username === selectedContext));
};

export const getOrgNameByUsername = (username: string, orgs: Organization[]) => {
  const org = orgs?.find((o) => o.username === username);
  return org?.full_name || org?.username;
};

export const getOrgUsernameByUsername = (username: string, orgs: Organization[]) => {
  const org = orgs?.find((o) => o.username === username);
  return org?.username;
};
