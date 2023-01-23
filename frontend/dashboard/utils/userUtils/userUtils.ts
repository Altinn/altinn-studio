import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import type { Organizations } from '../../services/organizationApi';

export const userHasAccessToSelectedContext = ({
  selectedContext,
  orgs,
}: {
  selectedContext: SelectedContext;
  orgs: Organizations;
}): boolean => {
  if (selectedContext == SelectedContextType.Self || selectedContext == SelectedContextType.All) {
    return true;
  }

  return Boolean(orgs.find((org) => org.id === selectedContext));
};
