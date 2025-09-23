import { useTaskOverrides } from 'src/core/contexts/TaskOverrides';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/hooks/navigation';

export function useProcessTaskId() {
  const overriddenTaskId = useTaskOverrides()?.taskId;
  const processTaskId = useProcessQuery().data?.currentTask?.elementId;
  const urlTaskId = useNavigationParam('taskId');
  return overriddenTaskId ?? processTaskId ?? urlTaskId;
}
