import { useCallback, useRef } from 'react';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useModelerEventListener } from './useModelerEventListener';
import { BpmnModelerInstance } from '../utils/bpmnModeler/BpmnModelerInstance';
import { useBpmnConfigPanelFormContext } from '../contexts/BpmnConfigPanelContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import type { TaskEvent } from '../types/TaskEvent';
import type { SelectionChangedEvent } from '../types/SelectionChangeEvent';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/bpmnObjectBuilders';
import { useStudioRecommendedNextActionContext } from '@studio/components';
import type Modeler from 'bpmn-js/lib/Modeler';
import type { Element } from 'bpmn-js/lib/model/Types';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import type { UpdateTaskIdContext } from '../commandHandlers/UpdateTaskIdCommandHandler';
import type { TaskIdChange } from 'app-shared/types/BpmnMetadataForm';

// Wrapper around bpmn-js to Reactify it

export type UseBpmnEditorResult = (div: HTMLDivElement) => void;

type UpdateTaskIdEvent = { context: UpdateTaskIdContext };

export const useBpmnEditor = (): UseBpmnEditorResult => {
  const { getUpdatedXml, setBpmnDetails, isReloadingRef } = useBpmnContext();
  const { metadataFormRef, resetForm } = useBpmnConfigPanelFormContext();
  const { addAction } = useStudioRecommendedNextActionContext();

  const { saveBpmn } = useBpmnApiContext();
  const addsOrRemovesTasksRef = useRef(false);

  const handleCommandStackChanged = useCallback((): void => {
    const addsOrRemovesTasks = addsOrRemovesTasksRef.current;
    addsOrRemovesTasksRef.current = false;
    if (isReloadingRef.current) return;
    const metadata = metadataFormRef.current || null;
    resetForm();
    saveBpmn(getUpdatedXml(), metadata, { addsOrRemovesTasks });
  }, [saveBpmn, resetForm, metadataFormRef, getUpdatedXml, isReloadingRef]);

  const setTaskIdChange = useCallback(
    (taskIdChange: TaskIdChange): void => {
      metadataFormRef.current = { ...metadataFormRef.current, taskIdChange };
    },
    [metadataFormRef],
  );

  // Command events cover undo/redo and leave ignored commands without metadata.
  const handleTaskIdUpdated = useCallback(
    ({ context }: UpdateTaskIdEvent): void =>
      setTaskIdChange({ oldId: context.oldId, newId: context.newId }),
    [setTaskIdChange],
  );

  const handleTaskIdUpdateReverted = useCallback(
    ({ context }: UpdateTaskIdEvent): void =>
      setTaskIdChange({ oldId: context.newId, newId: context.oldId }),
    [setTaskIdChange],
  );

  const handleShapeAdd = useCallback(
    (taskEvent: TaskEvent): void => {
      if (isReloadingRef.current) return; // Reloading re-adds every shape; those are not new tasks.
      if (isTask(taskEvent?.element)) addsOrRemovesTasksRef.current = true;
      const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(
        taskEvent?.element?.businessObject,
      );
      if (
        bpmnDetails.taskType === 'data' ||
        bpmnDetails.taskType === 'payment' ||
        bpmnDetails.taskType === 'signing'
      )
        addAction(bpmnDetails.id);
    },
    [addAction, isReloadingRef],
  );

  const handleShapeRemove = useCallback(
    (taskEvent: TaskEvent): void => {
      if (isReloadingRef.current) return; // Reloading removes every shape; those are not deleted tasks.
      if (isTask(taskEvent?.element)) addsOrRemovesTasksRef.current = true;
    },
    [isReloadingRef],
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

  const handleElementsChanged = useCallback(
    ({ elements }: { elements: Element[] }): void => {
      setBpmnDetails((current) => {
        if (!current || !elements.includes(current.element)) return current;
        return {
          ...getBpmnEditorDetailsFromBusinessObject(current.element.businessObject),
          element: current.element,
        };
      });
    },
    [setBpmnDetails],
  );

  useModelerEventListener<void>('commandStack.changed', handleCommandStackChanged);
  useModelerEventListener<UpdateTaskIdEvent>(
    'commandStack.updateTaskId.executed',
    handleTaskIdUpdated,
  );
  useModelerEventListener<UpdateTaskIdEvent>(
    'commandStack.updateTaskId.reverted',
    handleTaskIdUpdateReverted,
  );
  useModelerEventListener<TaskEvent>('shape.added', handleShapeAdd);
  useModelerEventListener<TaskEvent>('shape.remove', handleShapeRemove);
  useModelerEventListener<SelectionChangedEvent>('selection.changed', handleSelectionChange);
  useModelerEventListener('elements.changed', handleElementsChanged);

  return useEditorCallback();
};

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

function isTask(element: TaskEvent['element'] | undefined): boolean {
  const type = element?.businessObject?.$type;
  return type === BpmnTypeEnum.Task || type === BpmnTypeEnum.ServiceTask;
}
