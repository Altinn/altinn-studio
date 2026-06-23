import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { getTaskId } from 'app-shared/utils/layoutSetsUtils';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';

export const useSelectedTaskId = (selectedFormLayoutSetName: string): string => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  const set = layoutSets?.find((s) => s.id === selectedFormLayoutSetName);
  return (set ? getTaskId(set) : undefined) || TASKID_FOR_STATELESS_APPS;
};
