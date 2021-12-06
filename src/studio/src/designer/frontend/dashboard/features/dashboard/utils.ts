import { getLanguageFromKey } from 'app-shared/utils/language';
import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

import { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';
import { Organizations } from 'services/organizationApi';

type GetUidFilter = {
  userId: number;
  selectedContext: SelectedContext;
};

type GetReposLabel = {
  selectedContext: SelectedContext;
  orgs: Organizations;
  language: any;
};

export const getUidFilter = ({ selectedContext, userId }: GetUidFilter) => {
  if (selectedContext === SelectedContextType.All) {
    return undefined;
  }

  if (selectedContext === SelectedContextType.Self) {
    return userId;
  }

  return selectedContext;
};

export const getReposLabel = ({
  selectedContext,
  orgs,
  language,
}: GetReposLabel) => {
  if (selectedContext === SelectedContextType.All) {
    return getLanguageFromKey('dashboard.all_apps', language);
  }

  if (selectedContext === SelectedContextType.Self) {
    return getLanguageFromKey('dashboard.my_apps', language);
  }

  return `${
    orgs.find((org) => org.id === selectedContext).full_name
  } ${getLanguageFromKey('dashboard.apps', language)}`;
};
