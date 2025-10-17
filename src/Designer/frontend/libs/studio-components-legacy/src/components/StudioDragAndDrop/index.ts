import { StudioDragAndDropProvider } from './StudioDragAndDropProvider';
import type { StudioDragAndDropProviderProps } from './StudioDragAndDropProvider';
import { StudioDragAndDropList } from './StudioDragAndDropList';
import type { StudioDragAndDropListProps } from './StudioDragAndDropList';
import { StudioDragAndDropListItem } from './StudioDragAndDropListItem';
import type { StudioDragAndDropListItemProps } from './StudioDragAndDropListItem';
import { StudioDragAndDropNewItem } from './StudioDragAndDropNewItem';
import type { StudioDragAndDropNewItemProps } from './StudioDragAndDropNewItem';

type StudioDragAndDropComponent = {
  Provider: typeof StudioDragAndDropProvider;
  List: typeof StudioDragAndDropList;
  ListItem: typeof StudioDragAndDropListItem;
  NewItem: typeof StudioDragAndDropNewItem;
};

/**
 * @deprecated Use the @studio-components package instead
 */
export const StudioDragAndDrop: StudioDragAndDropComponent = {
  Provider: StudioDragAndDropProvider,
  List: StudioDragAndDropList,
  ListItem: StudioDragAndDropListItem,
  NewItem: StudioDragAndDropNewItem,
};

/**
 * @deprecated Use the @studio-components package instead
 */
export type {
  StudioDragAndDropProviderProps,
  StudioDragAndDropListProps,
  StudioDragAndDropListItemProps,
  StudioDragAndDropNewItemProps,
};
