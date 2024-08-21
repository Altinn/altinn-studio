import { SelectedContextType } from 'dashboard/context/HeaderContext';
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
