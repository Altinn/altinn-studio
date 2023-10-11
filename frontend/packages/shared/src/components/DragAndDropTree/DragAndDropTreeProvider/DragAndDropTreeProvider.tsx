import { DragAndDrop, DragAndDropProviderProps } from 'app-shared/components/dragAndDrop';
import React from 'react';

export type DragAndDropTreeProviderProps<T> = Omit<DragAndDropProviderProps<T>, 'gap'>;

export function DragAndDropTreeProvider<T>(props: DragAndDropTreeProviderProps<T>) {
  return (
    <DragAndDrop.Provider {...props} gap='4px'>
      {props.children}
    </DragAndDrop.Provider>
  );
}
