import { createContext } from 'react';

export type StudioDragAndDropListItemContextProps = {
  isDisabled: boolean;
  itemId: string;
};

export const StudioDragAndDropListItemContext =
  createContext<StudioDragAndDropListItemContextProps>({
    isDisabled: false,
    itemId: null,
  });
