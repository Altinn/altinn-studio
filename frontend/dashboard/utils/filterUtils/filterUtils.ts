import { SelectedContextType } from 'app-shared/navigation/main-header/Header';
import type { Organization } from 'app-shared/types/Organization';

type GetUidFilter = {
  userId: number;
  selectedContext: string | SelectedContextType;
  organizations: Organization[];
};

export const getUidFilter = ({
  selectedContext,
  userId,
  organizations,
}: GetUidFilter): undefined | number | SelectedContextType => {
  if (selectedContext === SelectedContextType.All) {
    return undefined;
  }

  if (selectedContext === SelectedContextType.Self) {
    return userId;
  }

  return organizations.find((org) => org.username === selectedContext)?.id;
};
