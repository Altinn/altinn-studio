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

export const StudioDragAndDrop: StudioDragAndDropComponent = {
  Provider: StudioDragAndDropProvider,
  List: StudioDragAndDropList,
  ListItem: StudioDragAndDropListItem,
  NewItem: StudioDragAndDropNewItem,
};

export type {
  StudioDragAndDropProviderProps,
  StudioDragAndDropListProps,
  StudioDragAndDropListItemProps,
  StudioDragAndDropNewItemProps,
};
