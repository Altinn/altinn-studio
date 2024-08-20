import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useNavigationParam } from 'src/features/routing/AppRoutingContext';
import { useTaskStore } from 'src/layout/Summary2/taskIdStore';

export function useProcessTaskId() {
  const { overriddenTaskId } = useTaskStore(({ overriddenTaskId }) => ({
    overriddenTaskId,
  }));
  const urlTaskId = useLaxProcessData()?.currentTask?.elementId;
  const currentTaskId = overriddenTaskId || urlTaskId;
  const taskId = useNavigationParam('taskId');
  return currentTaskId ?? taskId;
}
