import { useCallback, useEffect } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';
import { BpmnModelerInstance } from '../utils/bpmnModeler/BpmnModelerInstance';
import { useBpmnConfigPanelFormContext } from '../contexts/BpmnConfigPanelContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import type { TaskEvent } from '../types/TaskEvent';
import type { SelectionChangedEvent } from '../types/SelectionChangeEvent';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/bpmnObjectBuilders';
import { useStudioRecommendedNextActionContext } from 'libs/studio-components-legacy/src';
import type Modeler from 'bpmn-js/lib/Modeler';

// Wrapper around bpmn-js to Reactify it

export type UseBpmnEditorResult = (div: HTMLDivElement) => void;

export const useBpmnEditor = (): UseBpmnEditorResult => {
  const { getUpdatedXml, setBpmnDetails } = useBpmnContext();
  const { metadataFormRef, resetForm } = useBpmnConfigPanelFormContext();
  const { addAction } = useStudioRecommendedNextActionContext();

  const { saveBpmn, onProcessTaskAdd, onProcessTaskRemove } = useBpmnApiContext();

  const handleCommandStackChanged = useCallback(async () => {
    const xml = await getUpdatedXml();
    saveBpmn(xml, metadataFormRef.current || null);
    resetForm();
  }, [saveBpmn, resetForm, metadataFormRef, getUpdatedXml]);

  const handleShapeAdd = useCallback(
    async (taskEvent: TaskEvent): Promise<void> => {
      const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(
        taskEvent?.element?.businessObject,
      );
      onProcessTaskAdd({
        taskEvent,
        taskType: bpmnDetails.taskType,
      });
      if (
        bpmnDetails.taskType === 'data' ||
        bpmnDetails.taskType === 'payment' ||
        bpmnDetails.taskType === 'signing'
      )
        addAction(bpmnDetails.id);
    },
    [addAction, onProcessTaskAdd],
  );

  const handleShapeRemove = useCallback(
    (taskEvent: TaskEvent): void => {
      const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(
        taskEvent?.element?.businessObject,
      );
      onProcessTaskRemove({
        taskEvent,
        taskType: bpmnDetails.taskType,
      });
    },
    [onProcessTaskRemove],
  );

  const updateBpmnDetails = useCallback(
    (element: any) => {
      const bpmnDetails = {
        ...getBpmnEditorDetailsFromBusinessObject(element?.businessObject),
        element: element,
      };
      setBpmnDetails(bpmnDetails);
    },
    [setBpmnDetails],
  );

  const handleSelectionChange = useCallback(
    (selectionEvent: SelectionChangedEvent): void => {
      if (selectionEvent.newSelection.length !== 1) {
        setBpmnDetails(null);
        return;
      }
      const selectedElement = selectionEvent.newSelection[0];
      updateBpmnDetails(selectedElement);
    },
    [setBpmnDetails, updateBpmnDetails],
  );

  useModelerEventListener<void>('commandStack.changed', handleCommandStackChanged);
  useModelerEventListener<TaskEvent>('shape.added', handleShapeAdd);
  useModelerEventListener<TaskEvent>('shape.remove', handleShapeRemove);
  useModelerEventListener<SelectionChangedEvent>('selection.changed', handleSelectionChange);

  return useEditorCallback();
};

function useModelerEventListener<Event>(eventName: string, callback: (event: Event) => void): void {
  const { modelerRef, isInitialized } = useBpmnContext();

  useEffect(() => {
    if (isInitialized) {
      const modeler = modelerRef.current;
      modeler.on(eventName, callback);
      return () => modeler.off(eventName, callback);
    }
  }, [isInitialized, eventName, callback, modelerRef]);
}

function useEditorCallback(): (div: HTMLDivElement) => void {
  const { initialBpmnXml, modelerRef, setIsInitialized } = useBpmnContext();

  const initialize = useCallback(
    (div: HTMLDivElement) => {
      const modeler = BpmnModelerInstance.getInstance(div);
      if (!modelerRef.current) {
        modelerRef.current = modeler;
        initializeEditor(modeler, initialBpmnXml).then(() => setIsInitialized(true));
      }
    },
    [setIsInitialized, modelerRef, initialBpmnXml],
  );

  const cleanUp = useCallback(() => {
    setIsInitialized(false);
    modelerRef.current = null;
    BpmnModelerInstance.destroyInstance();
  }, [setIsInitialized, modelerRef]);

  return useCallback(
    (div: HTMLDivElement) => {
      initialize(div);
      if (div === null) cleanUp(); // Todo: Change this to a return function when we have upgraded to React 19. https://react.dev/reference/react-dom/components/common#react-19-added-cleanup-functions-for-ref-callbacks
    },
    [initialize, cleanUp],
  );
}

async function initializeEditor(modeler: Modeler, bpmnXml: string): Promise<void> {
  try {
    await modeler.importXML(bpmnXml);
    const canvas = modeler.get<{ zoom: (string: string) => void }>('canvas');
    canvas.zoom('fit-viewport');
  } catch (exception) {
    console.log('An error occurred while rendering the viewer:', exception);
  }
}
