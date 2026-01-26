import { FileScanResults } from 'src/features/attachments/types';
import type { NodesContext } from 'src/utils/layout/NodesContext';

/**
 * Checks if there are any pending attachments (uploading, updating, deleting, or infected).
 * This is a pure function that can be used both in hooks and as a selector.
 */
export function hasPendingAttachments(state: NodesContext): boolean {
  for (const id of Object.keys(state.nodeData)) {
    const nodeData = state.nodeData[id];
    if (!nodeData || !('attachments' in nodeData)) {
      continue;
    }

    const attachments = Object.values(nodeData.attachments);
    if (attachments.some((a) => !a.uploaded || a.updating || a.deleting)) {
      return true;
    }

    if (
      attachments.some(
        (a) =>
          a.uploaded &&
          (a.data.fileScanResult === FileScanResults.Infected || a.data.fileScanResult === FileScanResults.Pending),
      )
    ) {
      return true;
    }
  }
  return false;
}
