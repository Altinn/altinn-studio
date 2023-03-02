import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import { Organization } from 'dashboard/services/organizationService';

export const userHasAccessToSelectedContext = ({
  selectedContext,
  orgs,
}: {
  selectedContext: number | SelectedContextType;
  orgs: Organization[];
}): boolean => {
  if (selectedContext == SelectedContextType.Self || selectedContext == SelectedContextType.All) {
    return true;
  }

  return Boolean(orgs.find((org) => org.id === selectedContext));
};
