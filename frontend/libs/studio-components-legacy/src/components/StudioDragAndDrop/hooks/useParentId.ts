import { useContext } from 'react';
import { StudioDragAndDropRootContext } from '../StudioDragAndDropProvider';
import { StudioDragAndDropListItemContext } from '../StudioDragAndDropListItem';

/**
 * Retrieves the ID of the nearest ListItem parent, or the root ID of there are no ListItem parents.
 * @returns The parent ID.
 */
export const useParentId = (): string => {
  const rootContext = useContext(StudioDragAndDropRootContext);
  const listItemContext = useContext(StudioDragAndDropListItemContext);
  if (!rootContext) {
    throw new Error('useParentId must be used within a DragAndDropProvider.');
  }
  return listItemContext?.itemId || rootContext.rootId;
};
