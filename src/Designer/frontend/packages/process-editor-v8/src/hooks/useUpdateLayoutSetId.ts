import { useCallback } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import { isLayoutSetNamedAfterTask } from '../utils/processEditorUtils';
import { useReloadSavedProcess } from './useReloadSavedProcess';

/**
 * Renames a layout set. Where the layout set is named after its task, the rename also renames the task in the
 * saved process, so the editor then reloads the saved process and selects the renamed task.
 */
export const useUpdateLayoutSetId = (): ((
  layoutSetIdToUpdate: string,
  newLayoutSetId: string,
) => void) => {
  const { appVersion } = useBpmnContext();
  const { mutateLayoutSetId } = useBpmnApiContext();
  const reloadSavedProcess = useReloadSavedProcess();

  return useCallback(
    (layoutSetIdToUpdate: string, newLayoutSetId: string): void => {
      const onSuccess = isLayoutSetNamedAfterTask(appVersion)
        ? () => reloadSavedProcess(newLayoutSetId)
        : undefined;
      mutateLayoutSetId({ layoutSetIdToUpdate, newLayoutSetId }, { onSuccess });
    },
    [appVersion, mutateLayoutSetId, reloadSavedProcess],
  );
};
