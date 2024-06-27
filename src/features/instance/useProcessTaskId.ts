import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useNavigationParams } from 'src/hooks/useNavigatePage';
import { useTaskStore } from 'src/layout/Summary2/taskIdStore';

export function useProcessTaskId() {
  const { overriddenTaskId } = useTaskStore(({ overriddenTaskId }) => ({
    overriddenTaskId,
  }));
  const urlTaskId = useLaxProcessData()?.currentTask?.elementId;
  const currentTaskId = overriddenTaskId || urlTaskId;
  const { taskId } = useNavigationParams();
  return currentTaskId ?? taskId;
}
