import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';

export const useSelectedTaskId = (selectedFormLayoutSetName: string): string => {
  const { org, app } = useStudioEnvironmentParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  return (
    layoutSets?.sets.find((set) => set.id === selectedFormLayoutSetName)?.tasks?.[0] ||
    TASKID_FOR_STATELESS_APPS
  );
};
