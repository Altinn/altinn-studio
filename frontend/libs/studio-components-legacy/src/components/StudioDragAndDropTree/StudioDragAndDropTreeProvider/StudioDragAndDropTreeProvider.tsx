import React from 'react';
import { StudioDragAndDrop, type StudioDragAndDropProviderProps } from '../../StudioDragAndDrop';

export type StudioDragAndDropTreeProviderProps<T> = Omit<StudioDragAndDropProviderProps<T>, 'gap'>;

export function StudioDragAndDropTreeProvider<T>(props: StudioDragAndDropTreeProviderProps<T>) {
  return (
    <StudioDragAndDrop.Provider {...props} gap='.25rem'>
      {props.children}
    </StudioDragAndDrop.Provider>
  );
}
