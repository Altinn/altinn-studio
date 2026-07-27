import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';
import { getTaskIdForLayoutSet } from 'app-shared/utils/layoutSetsUtils';

export const useSelectedTaskId = (selectedFormLayoutSetName: string): string => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const selectedLayoutSet = layoutSets?.find((set) => set.id === selectedFormLayoutSetName);
  return (
    (selectedLayoutSet && getTaskIdForLayoutSet(selectedLayoutSet)) || TASKID_FOR_STATELESS_APPS
  );
};
