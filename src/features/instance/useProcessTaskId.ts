import { useTaskStore } from 'src/core/contexts/taskStoreContext';
import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';

export function useProcessTaskId() {
  const { overriddenTaskId } = useTaskStore(({ overriddenTaskId }) => ({
    overriddenTaskId,
  }));
  const urlTaskId = useLaxProcessData()?.currentTask?.elementId;
  const currentTaskId = overriddenTaskId || urlTaskId;
  const taskId = useNavigationParam('taskId');
  return currentTaskId ?? taskId;
}
