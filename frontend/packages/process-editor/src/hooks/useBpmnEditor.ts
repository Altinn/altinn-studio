import { useEffect, useCallback } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';
import { BpmnModelerInstance } from '../utils/bpmnModeler/BpmnModelerInstance';
import { useBpmnConfigPanelFormContext } from '../contexts/BpmnConfigPanelContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import type { TaskEvent } from '../types/TaskEvent';
import type { SelectionChangedEvent } from '../types/SelectionChangeEvent';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/bpmnObjectBuilders';
import { useStudioRecommendedNextActionContext } from '@studio/components';

// Wrapper around bpmn-js to Reactify it

export type UseBpmnEditorResult = (div: HTMLDivElement) => void;

export const useBpmnEditor = (): UseBpmnEditorResult => {
  const { getUpdatedXml, bpmnXml, modelerRef, setBpmnDetails } = useBpmnContext();
  const { metadataFormRef, resetForm } = useBpmnConfigPanelFormContext();
  const { addAction } = useStudioRecommendedNextActionContext();

  const { saveBpmn, onProcessTaskAdd, onProcessTaskRemove } = useBpmnApiContext();

  const handleCommandStackChanged = async () => {
    saveBpmn(await getUpdatedXml(), metadataFormRef.current || null);
    resetForm();
  };

  const handleShapeAdd = (taskEvent: TaskEvent): void => {
    const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(taskEvent?.element?.businessObject);
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
  };

  const handleShapeRemove = (taskEvent: TaskEvent): void => {
    const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(taskEvent?.element?.businessObject);
    onProcessTaskRemove({
      taskEvent,
      taskType: bpmnDetails.taskType,
    });
  };

  const handleSelectionChange = (selectionEvent: SelectionChangedEvent): void => {
    if (selectionEvent.newSelection.length !== 1) {
      setBpmnDetails(null);
      return;
    }
    const selectedElement = selectionEvent.newSelection[0];
    updateBpmnDetails(selectedElement);
  };

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

  const initializeEditor = async () => {
    if (!modelerRef.current) return;
    try {
      await modelerRef.current.importXML(bpmnXml);
      const canvas: any = modelerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (exception) {
      console.log('An error occurred while rendering the viewer:', exception);
    }
  };

  const initializeBpmnChanges = () => {
    modelerRef.current.on('commandStack.changed', async (): Promise<void> => {
      await handleCommandStackChanged();
    });
    modelerRef.current.on('shape.added', (taskEvent: TaskEvent): void => {
      handleShapeAdd(taskEvent);
    });
    modelerRef.current.on('shape.remove', (taskEvent: TaskEvent): void => {
      handleShapeRemove(taskEvent);
    });
    modelerRef.current.on('selection.changed', (selectionEvent: SelectionChangedEvent): void => {
      handleSelectionChange(selectionEvent);
    });
  };

  const canvasRef = useCallback((div: HTMLDivElement) => {
    if (modelerRef.current) return;

    modelerRef.current = BpmnModelerInstance.getInstance(div);

    initializeEditor().then(() => {
      // Wait for the initializeEditor to be initialized before attaching event listeners, to avoid trigger add.shape events on first draw
      initializeBpmnChanges();
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Missing dependencies are not added to avoid getModeler to be called multiple times

  useEffect(() => {
    // Destroy the modeler instance when the component is unmounted
    return () => {
      BpmnModelerInstance.destroyInstance();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return canvasRef;
};
