import React from 'react';
import { StudioDragAndDrop, type StudioDragAndDropProviderProps } from '@studio/components';

export type DragAndDropTreeProviderProps<T> = Omit<StudioDragAndDropProviderProps<T>, 'gap'>;

export function DragAndDropTreeProvider<T>(props: DragAndDropTreeProviderProps<T>) {
  return (
    <StudioDragAndDrop.Provider {...props} gap='.25rem'>
      {props.children}
    </StudioDragAndDrop.Provider>
  );
}
