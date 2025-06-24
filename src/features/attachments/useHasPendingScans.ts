import { FileScanResults } from 'src/features/attachments/types';
import { useLaxInstanceData } from 'src/features/instance/InstanceContext';

export function useHasPendingScans(): boolean {
  const instanceData = useLaxInstanceData((data) => data);

  if (!instanceData?.data) {
    return false;
  }

  return instanceData.data.some((dataElement) => dataElement.fileScanResult === FileScanResults.Pending);
}
