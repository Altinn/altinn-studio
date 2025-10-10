import { useNavigationParam } from 'src/hooks/navigation';
import { TaskKeys } from 'src/hooks/useNavigatePage';

export const useIsReceiptPage = () => {
  const taskId = useNavigationParam('taskId');
  return taskId === TaskKeys.CustomReceipt || taskId === TaskKeys.ProcessEnd;
};
