import { useContext } from 'react';
import { DragAndDropRootContext } from '../DragAndDropProvider';
import { DragAndDropListItemContext } from '../DragAndDropListItem';

/**
 * Retrieves the ID of the nearest ListItem parent, or the root ID of there are no ListItem parents.
 * @returns The parent ID.
 */
export const useParentId = (): string => {
  const rootContext = useContext(DragAndDropRootContext);
  const listItemContext = useContext(DragAndDropListItemContext);
  if (!rootContext) {
    throw new Error('useParentId must be used within a DragAndDropProvider.');
  }
  return listItemContext?.itemId || rootContext.rootId;
};
