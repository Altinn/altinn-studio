import { DragAndDropTreeItem } from './DragAndDropTreeItem';
import { DragAndDropTreeRoot } from './DragAndDropTreeRoot';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import { DragAndDropTreeProvider } from './DragAndDropTreeProvider';

type DragAndDropTreeComponent = {
  Item: typeof DragAndDropTreeItem;
  Root: typeof DragAndDropTreeRoot;
  Provider: typeof DragAndDropTreeProvider;
  NewItem: typeof DragAndDrop.NewItem;
};

export const DragAndDropTree: DragAndDropTreeComponent = {
  Item: DragAndDropTreeItem,
  Root: DragAndDropTreeRoot,
  Provider: DragAndDropTreeProvider,
  NewItem: DragAndDrop.NewItem,
};
