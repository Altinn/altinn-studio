import { createContext } from 'react';

export type DragAndDropListItemContextProps = {
  isDisabled: boolean;
  itemId: string;
};

export const DragAndDropListItemContext = createContext<DragAndDropListItemContextProps>({
  isDisabled: false,
  itemId: null,
});
