import { ComponentType } from '../components';

export interface NewDndItem {
  isNew: true;
  type: ComponentType;
}

export interface ExistingDndItem {
  isNew: false;
  id: string;
  position: ItemPosition;
}

export type DndItem = NewDndItem | ExistingDndItem;

export enum DraggableEditorItemType {
  ToolbarItem = 'TOOLBAR_ITEM',
  Component = 'COMPONENT',
  Container = 'CONTAINER',
}

export enum DragCursorPosition {
  UpperHalf = 'UpperHalf', // Component is dragged over the upper half of the target component
  LowerHalf = 'LowerHalf', // Component is dragged over the lower half of the target component
  Outside = 'Outside', // Component is dragged outside of the target component
  Self = 'Self', // The dragged component is the same as the target component
  Idle = 'Idle', // Nothing relevant is being dragged
}

export type HandleDrop = (draggedItem: DndItem, droppedPosition: ItemPosition) => void;

export interface ItemPosition {
  parentId: string;
  index: number;
}
