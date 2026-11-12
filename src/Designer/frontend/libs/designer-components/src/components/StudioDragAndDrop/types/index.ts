export interface NewDndItem<T> {
  isNew: true;
  payload: T;
}

export interface ExistingDndItem {
  isNew: false;
  id: string;
  position: ItemPosition;
}

export type DndItem<T> = NewDndItem<T> | ExistingDndItem;

export enum DraggableEditorItemType {
  ToolbarItem = 'TOOLBAR_ITEM',
  ExistingItem = 'EXISTING_ITEM',
}

export enum DragCursorPosition {
  UpperHalf = 'UpperHalf', // Component is dragged over the upper half of the target component
  LowerHalf = 'LowerHalf', // Component is dragged over the lower half of the target component
  Outside = 'Outside', // Component is dragged outside of the target component
  Self = 'Self', // The dragged component is the same as the target component
  Idle = 'Idle', // Nothing relevant is being dragged
}

export type HandleDrop<T> = (draggedItem: DndItem<T>, droppedPosition: ItemPosition) => void;

export type HandleMove = (draggedItemId: string, droppedPosition: ItemPosition) => void;
export type HandleAdd<T> = (payload: T, droppedPosition: ItemPosition) => void;

export interface ItemPosition {
  parentId: string;
  index: number;
}
