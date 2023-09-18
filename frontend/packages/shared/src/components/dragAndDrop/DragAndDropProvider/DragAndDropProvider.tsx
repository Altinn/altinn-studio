import React, { FunctionComponent, ReactNode } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { RootIdContext } from './RootIdContext';

export interface DragAndDropProviderProps {
  rootId: string;
  children: ReactNode;
}

export const DragAndDropProvider: FunctionComponent<DragAndDropProviderProps> = ({
  children,
  rootId,
}: DragAndDropProviderProps) => (
  <DndProvider backend={HTML5Backend}>
    <RootIdContext.Provider value={rootId}>{children}</RootIdContext.Provider>
  </DndProvider>
);
