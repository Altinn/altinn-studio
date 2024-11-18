import { DragAndDropTreeItem } from './DragAndDropTreeItem';
import { DragAndDropTreeRoot } from './DragAndDropTreeRoot';
import { StudioDragAndDrop } from '@studio/components';
import { DragAndDropTreeProvider } from './DragAndDropTreeProvider';

type DragAndDropTreeComponent = {
  Item: typeof DragAndDropTreeItem;
  Root: typeof DragAndDropTreeRoot;
  Provider: typeof DragAndDropTreeProvider;
  NewItem: typeof StudioDragAndDrop.NewItem;
};

export const DragAndDropTree: DragAndDropTreeComponent = {
  Item: DragAndDropTreeItem,
  Root: DragAndDropTreeRoot,
  Provider: DragAndDropTreeProvider,
  NewItem: StudioDragAndDrop.NewItem,
};
