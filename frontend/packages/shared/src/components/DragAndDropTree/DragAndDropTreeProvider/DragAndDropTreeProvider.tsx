import type { DragAndDropProviderProps } from 'app-shared/components/dragAndDrop';
import { DragAndDrop } from 'app-shared/components/dragAndDrop';
import React from 'react';

export type DragAndDropTreeProviderProps<T> = Omit<DragAndDropProviderProps<T>, 'gap'>;

export function DragAndDropTreeProvider<T>(props: DragAndDropTreeProviderProps<T>) {
  return (
    <DragAndDrop.Provider {...props} gap='.25rem'>
      {props.children}
    </DragAndDrop.Provider>
  );
}
