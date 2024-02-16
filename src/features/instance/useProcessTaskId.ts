import { useLaxProcessData } from 'src/features/instance/ProcessContext';
import { useNavigationParams } from 'src/hooks/useNavigatePage';

export function useProcessTaskId() {
  const currentTaskId = useLaxProcessData()?.currentTask?.elementId;
  const { taskId } = useNavigationParams();
  return currentTaskId ?? taskId;
}
