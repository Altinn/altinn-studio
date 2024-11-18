import { StudioDragAndDropTreeItem } from './StudioDragAndDropTreeItem';
import { StudioDragAndDropTreeRoot } from './StudioDragAndDropTreeRoot';
import { StudioDragAndDrop } from '../StudioDragAndDrop';
import { StudioDragAndDropTreeProvider } from './StudioDragAndDropTreeProvider';

type StudioDragAndDropTreeComponent = {
  Item: typeof StudioDragAndDropTreeItem;
  Root: typeof StudioDragAndDropTreeRoot;
  Provider: typeof StudioDragAndDropTreeProvider;
  NewItem: typeof StudioDragAndDrop.NewItem;
};

export const StudioDragAndDropTree: StudioDragAndDropTreeComponent = {
  Item: StudioDragAndDropTreeItem,
  Root: StudioDragAndDropTreeRoot,
  Provider: StudioDragAndDropTreeProvider,
  NewItem: StudioDragAndDrop.NewItem,
};

export { type StudioDragAndDropTreeProviderProps } from './StudioDragAndDropTreeProvider';
