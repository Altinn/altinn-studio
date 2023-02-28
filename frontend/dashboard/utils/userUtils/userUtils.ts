import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import { Organization } from 'dashboard/services/organizationService';

export const userHasAccessToSelectedContext = ({
  selectedContext,
  orgs,
}: {
  selectedContext: SelectedContext;
  orgs: Organization[];
}): boolean => {
  if (selectedContext == SelectedContextType.Self || selectedContext == SelectedContextType.All) {
    return true;
  }

  return Boolean(orgs.find((org) => org.id === selectedContext));
};
