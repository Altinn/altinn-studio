import { useCallback } from 'react';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import { useReloadSavedProcess } from './useReloadSavedProcess';

/**
 * Renames a layout set. Where the layout set is named after its task, the rename also renames the task in the
 * saved process, so the editor then reloads the saved process and selects the renamed task.
 */
export const useUpdateLayoutSetId = (): ((
  layoutSetIdToUpdate: string,
  newLayoutSetId: string,
) => void) => {
  const { mutateLayoutSetId } = useBpmnApiContext();
  const reloadSavedProcess = useReloadSavedProcess();

  return useCallback(
    (layoutSetIdToUpdate: string, newLayoutSetId: string): void => {
      const onSuccess = () => reloadSavedProcess(newLayoutSetId);
      mutateLayoutSetId({ layoutSetIdToUpdate, newLayoutSetId }, { onSuccess });
    },
    [mutateLayoutSetId, reloadSavedProcess],
  );
};
