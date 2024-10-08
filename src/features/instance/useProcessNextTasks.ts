import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useStrictInstanceId } from 'src/features/instance/InstanceContext';
import { useLaxProcessData, useTaskTypeFromBackend } from 'src/features/instance/ProcessContext';
import { ProcessTaskType } from 'src/types';

function useProcessNextTasksQuery() {
  const { fetchProcessNextSteps } = useAppQueries();
  const instanceId = useStrictInstanceId();
  const process = useLaxProcessData();
  const taskId = process?.currentTask?.elementId;
  const taskType = useTaskTypeFromBackend();

  return useQuery({
    queryKey: ['fetchProcessNextSteps', instanceId, taskId],
    queryFn: () => fetchProcessNextSteps(instanceId),
    enabled: !!instanceId && !!taskId && taskType !== ProcessTaskType.Archived,
  });
}

/**
 * This gives you a list of possible next tasks you can navigate to from the current task.
 */
export const useProcessNextTasks = (defaultValue: string[] | undefined = []) =>
  useProcessNextTasksQuery().data || defaultValue;
