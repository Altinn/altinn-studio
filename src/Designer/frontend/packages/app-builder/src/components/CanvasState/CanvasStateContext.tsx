import { createContext, useContext, useState } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';

export type EditingText = {
  textKey: string;
  /** The element on the canvas that shows the text. The text editor is placed over it. */
  anchor: HTMLElement;
};

export type CanvasState = {
  selectedComponentId?: string;
  editingText?: EditingText;
  /** Selects a component, or clears the selection when given undefined. */
  selectComponent: (componentId: string | undefined) => void;
  startEditingText: (editingText: EditingText) => void;
  stopEditingText: () => void;
};

const CanvasStateContext = createContext<CanvasState | null>(null);

export function CanvasStateProvider({ children }: PropsWithChildren): ReactElement {
  const [selectedComponentId, setSelectedComponentId] = useState<string>();
  const [editingText, setEditingText] = useState<EditingText>();

  const selectComponent = (componentId: string | undefined): void => {
    setEditingText(undefined);
    setSelectedComponentId(componentId);
  };

  const value: CanvasState = {
    selectedComponentId,
    editingText,
    selectComponent,
    startEditingText: setEditingText,
    stopEditingText: () => setEditingText(undefined),
  };

  return <CanvasStateContext.Provider value={value}>{children}</CanvasStateContext.Provider>;
}

export function useCanvasState(): CanvasState {
  const context = useContext(CanvasStateContext);
  if (!context) throw new Error('useCanvasState must be used within a CanvasStateProvider.');
  return context;
}
