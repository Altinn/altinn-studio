import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { SelectedContext } from '../../resources/fetchDashboardResources/dashboardSlice';

type GetUidFilter = {
  userId: number;
  selectedContext: SelectedContext;
};

export const getUidFilter = ({
  selectedContext,
  userId,
}: GetUidFilter): undefined | number | SelectedContext => {
  if (selectedContext === SelectedContextType.All) {
    return undefined;
  }

  if (selectedContext === SelectedContextType.Self) {
    return userId;
  }

  return selectedContext;
};
