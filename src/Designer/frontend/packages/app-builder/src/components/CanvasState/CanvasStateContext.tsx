import { createContext, useContext, useState } from 'react';
import type { PropsWithChildren, ReactElement } from 'react';
import type { Placement } from '../../utils/layoutUtils';
import type { QuestionComponentType } from '../../utils/newComponentUtils';

/** Which settings panel is open on the canvas. */
export type OpenSettings = 'component' | 'page';

/** A question the user has chosen to add, waiting for its label. */
export type NewQuestion = {
  type: QuestionComponentType;
  placement: Placement;
};

export type CanvasState = {
  selectedComponentId?: string;
  openSettings?: OpenSettings;
  /** Where the add box is open, if it is. */
  addPlacement?: Placement;
  newQuestion?: NewQuestion;
  /** The component the user asked to delete, while the dialog asks what to remove with it. */
  componentIdToDelete?: string;
  /** Selects a component, or clears the selection when given undefined. Closes what was open. */
  selectComponent: (componentId: string | undefined) => void;
  setOpenSettings: (openSettings: OpenSettings | undefined) => void;
  openAddBox: (placement: Placement) => void;
  startNewQuestion: (newQuestion: NewQuestion) => void;
  /** Closes the add box and the label form for a new question. */
  stopAdding: () => void;
  requestDelete: (componentId: string | undefined) => void;
};

const CanvasStateContext = createContext<CanvasState | null>(null);

export function CanvasStateProvider({ children }: PropsWithChildren): ReactElement {
  const [selectedComponentId, setSelectedComponentId] = useState<string>();
  const [openSettings, setOpenSettings] = useState<OpenSettings>();
  const [addPlacement, setAddPlacement] = useState<Placement>();
  const [newQuestion, setNewQuestion] = useState<NewQuestion>();
  const [componentIdToDelete, setComponentIdToDelete] = useState<string>();

  const stopAdding = (): void => {
    setAddPlacement(undefined);
    setNewQuestion(undefined);
  };

  const selectComponent = (componentId: string | undefined): void => {
    if (componentId === selectedComponentId) return;
    setOpenSettings(undefined);
    stopAdding();
    setSelectedComponentId(componentId);
  };

  const value: CanvasState = {
    selectedComponentId,
    openSettings,
    addPlacement,
    newQuestion,
    componentIdToDelete,
    selectComponent,
    setOpenSettings,
    openAddBox: (placement) => {
      setNewQuestion(undefined);
      setAddPlacement(placement);
    },
    startNewQuestion: (question) => {
      setAddPlacement(undefined);
      setNewQuestion(question);
    },
    stopAdding,
    requestDelete: setComponentIdToDelete,
  };

  return <CanvasStateContext.Provider value={value}>{children}</CanvasStateContext.Provider>;
}

export function useCanvasState(): CanvasState {
  const context = useContext(CanvasStateContext);
  if (!context) throw new Error('useCanvasState must be used within a CanvasStateProvider.');
  return context;
}
