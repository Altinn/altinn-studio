import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';

export function useProcessTaskId() {
  const overriddenTaskId = useTaskStore((state) => state.overriddenTaskId);
  const processTaskId = useProcessQuery().data?.currentTask?.elementId;
  const urlTaskId = useNavigationParam('taskId');
  return overriddenTaskId ?? processTaskId ?? urlTaskId;
}
