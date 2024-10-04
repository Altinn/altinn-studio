import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';

export function useProcessTaskId() {
  const overriddenTaskId = useTaskStore((state) => state.overriddenTaskId);
  const processTaskId = useLaxProcessData()?.currentTask?.elementId;
  const urlTaskId = useNavigationParam('taskId');
  return overriddenTaskId ?? processTaskId ?? urlTaskId;
}
