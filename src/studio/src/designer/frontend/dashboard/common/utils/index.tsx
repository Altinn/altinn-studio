import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import type { Organizations } from '../../services/organizationApi';

export const appNameRegex = /^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$/;

export const validateRepoName = (repoName: string) => {
  return appNameRegex.test(repoName);
};

export const userHasAccessToSelectedContext = ({
  selectedContext,
  orgs,
}: {
  selectedContext: SelectedContext;
  orgs: Organizations;
}) => {
  if (selectedContext == SelectedContextType.Self || selectedContext == SelectedContextType.All) {
    return true;
  }

  return Boolean(orgs.find((org) => org.id === selectedContext));
};
