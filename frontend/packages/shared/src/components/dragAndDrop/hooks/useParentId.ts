import { useContext } from 'react';
import { RootIdContext } from '../DragAndDropProvider';
import { DragAndDropListItemContext } from '../DragAndDropListItem';

/**
 * Retrieves the ID of the nearest ListItem parent, or the root ID of there are no ListItem parents.
 * @returns The parent ID.
 */
export const useParentId = (): string => {
  const rootIdContext = useContext(RootIdContext);
  const droppableListContext = useContext(DragAndDropListItemContext);
  if (typeof rootIdContext !== 'string') {
    throw new Error('useParentId must be used within a DragAndDropProvider.');
  }
  return droppableListContext?.itemId || rootIdContext;
};
