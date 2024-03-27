import { useStudioUrlParams } from 'app-shared/hooks/useStudioUrlParams';
import { useLayoutSetsQuery } from './queries/useLayoutSetsQuery';
import { TASKID_FOR_STATELESS_APPS } from 'app-shared/constants';

export const useSelectedTaskId = (selectedFormLayoutSetName: string): string => {
  const { org, app } = useStudioUrlParams();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);

  return (
    layoutSets?.sets.find((set) => set.id === selectedFormLayoutSetName)?.tasks?.[0] ||
    TASKID_FOR_STATELESS_APPS
  );
};
