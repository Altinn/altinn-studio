import { useCallback } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import { isLayoutSetNamedAfterTask } from '../utils/processEditorUtils';
import { useReloadSavedProcess } from './useReloadSavedProcess';

/**
 * Renames a layout set. Where the layout set is named after its task, the rename also renames the task in the
 * saved process, so the editor then reloads the saved process and selects the renamed task. The rename and the
 * reload run in turn with the saves of the process, so an edit made meanwhile is not saved with the old task id.
 */
export const useUpdateLayoutSetId = (): ((
  layoutSetIdToUpdate: string,
  newLayoutSetId: string,
) => void) => {
  const { appVersion, enqueueProcessChange } = useBpmnContext();
  const { mutateLayoutSetId } = useBpmnApiContext();
  const reloadSavedProcess = useReloadSavedProcess();

  return useCallback(
    (layoutSetIdToUpdate: string, newLayoutSetId: string): void => {
      enqueueProcessChange(async () => {
        try {
          await mutateLayoutSetId({ layoutSetIdToUpdate, newLayoutSetId });
        } catch {
          return; // The mutation reports its own errors.
        }
        if (isLayoutSetNamedAfterTask(appVersion)) await reloadSavedProcess(newLayoutSetId);
      });
    },
    [appVersion, enqueueProcessChange, mutateLayoutSetId, reloadSavedProcess],
  );
};
