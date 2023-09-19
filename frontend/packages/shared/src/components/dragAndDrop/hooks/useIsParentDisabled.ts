import { useContext } from 'react';
import { DragAndDropListItemContext } from '../DragAndDropListItem';

/**
 * @returns True if a parent ListItem is disabled, false otherwise.
 */
export const useIsParentDisabled = (): boolean => {
  const context = useContext(DragAndDropListItemContext);
  return !!context?.isDisabled;
};
