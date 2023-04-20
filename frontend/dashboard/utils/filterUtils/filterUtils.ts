import { SelectedContextType } from 'app-shared/navigation/main-header/Header';

type GetUidFilter = {
  userId: number;
  selectedContext: number | SelectedContextType;
};

export const getUidFilter = ({
  selectedContext,
  userId,
}: GetUidFilter): undefined | number | SelectedContextType => {
  if (selectedContext === SelectedContextType.All) {
    return undefined;
  }

  if (selectedContext === SelectedContextType.Self) {
    return userId;
  }

  return selectedContext;
};
