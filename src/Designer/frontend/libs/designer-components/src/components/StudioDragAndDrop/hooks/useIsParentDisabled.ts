import { useContext } from 'react';
import { StudioDragAndDropListItemContext } from '../StudioDragAndDropListItem';

/**
 * @returns True if a parent ListItem is disabled, false otherwise.
 */
export const useIsParentDisabled = (): boolean => {
  const context = useContext(StudioDragAndDropListItemContext);
  return !!context?.isDisabled;
};
