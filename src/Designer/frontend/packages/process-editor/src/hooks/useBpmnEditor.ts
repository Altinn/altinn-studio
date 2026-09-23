import { useCallback, useEffect, useRef } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';
import { BpmnModelerInstance } from '../utils/bpmnModeler/BpmnModelerInstance';
import { useBpmnConfigPanelFormContext } from '../contexts/BpmnConfigPanelContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import type { TaskEvent } from '../types/TaskEvent';
import type { SelectionChangedEvent } from '../types/SelectionChangeEvent';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/bpmnObjectBuilders';
import { useStudioRecommendedNextActionContext } from '@studio/components';
import type Modeler from 'bpmn-js/lib/Modeler';

// Wrapper around bpmn-js to Reactify it

export type UseBpmnEditorResult = (div: HTMLDivElement) => void;

export const useBpmnEditor = (): UseBpmnEditorResult => {
  const { getUpdatedXml, setBpmnDetails, modelerRef } = useBpmnContext();
  const { metadataFormRef, resetForm } = useBpmnConfigPanelFormContext();
  const { addAction } = useStudioRecommendedNextActionContext();
  const isRestoringRef = useRef<boolean>(false);

  const { saveBpmn, getSavedBpmn, onProcessTaskAdd, onProcessTaskRemove } = useBpmnApiContext();

  // Importing removes and re-adds every shape; those are not task removals or additions, so the shape
  // handlers ignore them. It clears the command stack without firing "commandStack.changed", so it does not save.
  const restoreSavedProcess = useCallback(async (): Promise<void> => {
    try {
      const savedXml = await getSavedBpmn();
      setBpmnDetails(null);
      isRestoringRef.current = true;
      await modelerRef.current?.importXML(savedXml);
    } catch {
      // The editor keeps its current state; the failed save has already been reported.
    } finally {
      isRestoringRef.current = false;
    }
  }, [getSavedBpmn, setBpmnDetails, modelerRef]);

  const handleCommandStackChanged = useCallback(async () => {
    const xml = await getUpdatedXml();
    const metadata = metadataFormRef.current || null;
    resetForm();
    try {
      await saveBpmn(xml, metadata);
    } catch {
      // A rejected task id change would otherwise be sent again with the next edit, without the metadata that
      // renames the task's layout set. Other failed changes are sent again with the next edit, as before.
      if (metadata?.taskIdChange) await restoreSavedProcess();
    }
  }, [saveBpmn, resetForm, metadataFormRef, getUpdatedXml, restoreSavedProcess]);

  const handleShapeAdd = useCallback(
    async (taskEvent: TaskEvent): Promise<void> => {
      if (isRestoringRef.current) return;
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
      if (isRestoringRef.current) return;
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
  const { initialBpmnXml, modelerRef, setIsInitialized, appVersion } = useBpmnContext();

  const initialize = useCallback(
    (div: HTMLDivElement) => {
      const modeler = BpmnModelerInstance.getInstance(div, appVersion);
      if (!modelerRef.current) {
        modelerRef.current = modeler;
        initializeEditor(modeler, initialBpmnXml).then(() => setIsInitialized(true));
      }
    },
    [setIsInitialized, modelerRef, initialBpmnXml, appVersion],
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
