export interface EditorDndItem {
  id: string; // itemId, regardless.
  containerId?: string;
  onDrop?: (containerId: string, position: number) => void;
  index?: number;
  type: ItemType;
}

export enum ItemType {
  TOOLBAR_ITEM = 'TOOLBAR_ITEM',
  ITEM = 'ITEM',
  CONTAINER = 'CONTAINER',
  Right = 'RIGHT',
}

export enum ContainerPos {
  TOP = 'TOP',
  BOTTOM = 'BOTTOM',
}

/**
 * @see DesignView
 */
export interface EditorDndEvents {
  moveItem: (
    movedItem: EditorDndItem,
    targetItem: EditorDndItem,
    containerPos?: ContainerPos,
  ) => void;
  moveItemToBottom: (item: EditorDndItem) => void;
  moveItemToTop: (item: EditorDndItem) => void;
  onDropItem: (reset?: boolean) => void;
}
