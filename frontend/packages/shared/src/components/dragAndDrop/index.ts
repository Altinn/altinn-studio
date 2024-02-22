import { DragAndDropProvider, type DragAndDropProviderProps } from './DragAndDropProvider';
import { DragAndDropList, type DragAndDropListProps } from './DragAndDropList';
import { DragAndDropListItem, type DragAndDropListItemProps } from './DragAndDropListItem';
import { DragAndDropNewItem, type DragAndDropNewItemProps } from './DragAndDropNewItem';

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
