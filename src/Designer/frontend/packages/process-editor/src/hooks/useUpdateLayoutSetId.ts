import { useCallback } from 'react';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';

export const useUpdateLayoutSetId = (): ((
  layoutSetIdToUpdate: string,
  newLayoutSetId: string,
) => void) => {
  const { mutateLayoutSetId } = useBpmnApiContext();

  return useCallback(
    (layoutSetIdToUpdate: string, newLayoutSetId: string): void => {
      mutateLayoutSetId({ layoutSetIdToUpdate, newLayoutSetId });
    },
    [mutateLayoutSetId],
  );
};
