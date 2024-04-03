import { DragAndDropProvider } from './DragAndDropProvider';
import type { DragAndDropProviderProps } from './DragAndDropProvider';
import { DragAndDropList } from './DragAndDropList';
import type { DragAndDropListProps } from './DragAndDropList';
import { DragAndDropListItem } from './DragAndDropListItem';
import type { DragAndDropListItemProps } from './DragAndDropListItem';
import { DragAndDropNewItem } from './DragAndDropNewItem';
import type { DragAndDropNewItemProps } from './DragAndDropNewItem';

type DragAndDropComponent = {
  Provider: typeof DragAndDropProvider;
  List: typeof DragAndDropList;
  ListItem: typeof DragAndDropListItem;
  NewItem: typeof DragAndDropNewItem;
};

export const DragAndDrop: DragAndDropComponent = {
  Provider: DragAndDropProvider,
  List: DragAndDropList,
  ListItem: DragAndDropListItem,
  NewItem: DragAndDropNewItem,
};

export type {
  DragAndDropProviderProps,
  DragAndDropListProps,
  DragAndDropListItemProps,
  DragAndDropNewItemProps,
};
