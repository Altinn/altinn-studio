import { createContext } from 'react';

export type DragDropListItemContextProps = {
  isDisabled: boolean;
  itemId: string;
};

export const DragAndDropListItemContext = createContext<DragDropListItemContextProps>({
  isDisabled: false,
  itemId: null,
});
