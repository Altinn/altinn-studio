export interface EditorDndItem {
  id: string;
  containerId?: string;
  onDrop?: (containerId: string, position: number) => void;
  index?: number;
  type: ItemType;
}

export enum ItemType {
  ToolbarItem = 'TOOLBAR_ITEM',
  Item = 'ITEM',
  Container = 'CONTAINER',
}

export enum ContainerPos {
  Top = 'TOP',
  Bottom = 'BOTTOM',
}

/**
 * @see DesignView
 */
export interface EditorDndEvents {
  moveItem: (
    movedItem: EditorDndItem,
    targetItem: EditorDndItem,
    toIndex?: number,
  ) => void;
  moveItemToBottom: (item: EditorDndItem) => void;
  moveItemToTop: (item: EditorDndItem) => void;
  onDropItem: (reset?: boolean) => void;
}
