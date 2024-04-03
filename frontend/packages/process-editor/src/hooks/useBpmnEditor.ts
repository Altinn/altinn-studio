import type { MutableRefObject } from 'react';
import { useRef, useEffect } from 'react';
import type BpmnModeler from 'bpmn-js/lib/Modeler';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnModeler } from './useBpmnModeler';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/hookUtils';
import type { BpmnDetails } from '../types/BpmnDetails';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
  modelerRef: MutableRefObject<BpmnModeler>;
};

export const useBpmnEditor = (): UseBpmnViewerResult => {
  const {
    bpmnXml,
    modelerRef,
    setNumberOfUnsavedChanges,
    setDataTasksAdded,
    setDataTasksRemoved,
    setBpmnDetails,
  } = useBpmnContext();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { getModeler } = useBpmnModeler();

  useEffect(() => {
    if (!canvasRef.current) {
      console.log('Canvas reference is not yet available in the DOM.');
      return;
    }
    const modelerInstance: BpmnModeler = getModeler(canvasRef.current);

    // set modelerRef.current to the Context so that it can be used in other components
    modelerRef.current = modelerInstance;

    const initializeEditor = async () => {
      try {
        await modelerInstance.importXML(bpmnXml);
        const canvas: any = modelerInstance.get('canvas');
        canvas.zoom('fit-viewport');
        // Reset the dataTasks tracking states when the editor is initialized
        setDataTasksAdded([]);
        setDataTasksRemoved([]);
      } catch (exception) {
        console.log('An error occurred while rendering the viewer:', exception);
      }
    };

    initializeEditor();
  }, [
    bpmnXml,
    modelerRef,
    setBpmnDetails,
    setNumberOfUnsavedChanges,
    setDataTasksAdded,
    setDataTasksRemoved,
  ]);

  useEffect(() => {
    const modelerInstance: BpmnModeler = getModeler(canvasRef.current);
    const initializeUnsavedChangesCount = () => {
      modelerInstance.on('commandStack.changed', () => {
        setNumberOfUnsavedChanges((prevCount) => prevCount + 1);
      });
    };

    const initializeChangesStatus = () => {
      modelerInstance.on('shape.add', (e: any) => {
        const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
        updateDataTaskTrackingLists(bpmnDetails, 'add');
      });

      modelerInstance.on('shape.remove', (e: any) => {
        const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
        updateDataTaskTrackingLists(bpmnDetails, 'remove');
      });
    };

    const eventBus: BpmnModeler = modelerInstance.get('eventBus');
    const events = ['element.click'];

    events.forEach((event) => {
      eventBus.on(event, (event: any) => {
        if (!event) return;

        const bpmnDetails = {
          ...getBpmnEditorDetailsFromBusinessObject(event.element?.businessObject),
          element: event.element,
        };
        setBpmnDetails(bpmnDetails);
      });
    });

    initializeUnsavedChangesCount();
    initializeChangesStatus();
  }, []);

  /**
   * Updates the data task tracking lists based on the action
   * action add: Adds the item to the dataTasksAdded list and removes it from the dataTasksRemoved list
   * action remove: Adds the item to the dataTasksRemoved list and removes it from the dataTasksAdded list
   * @param itemToAdd The item to add to the primary list
   * @param action The action performed on the item
   */
  const updateDataTaskTrackingLists = (itemToAdd: BpmnDetails, action: 'add' | 'remove') => {
    if (itemToAdd?.taskType !== 'data') {
      return;
    }

    if (action === 'add') {
      setDataTasksAdded((prevItems: BpmnDetails[]) => [...prevItems, itemToAdd]);
      setDataTasksRemoved((prevItems) => prevItems.filter((task) => task.id !== itemToAdd.id));
      return;
    }

    if (action === 'remove') {
      setDataTasksRemoved((prevItems: BpmnDetails[]) => [...prevItems, itemToAdd]);
      setDataTasksAdded((prevItems) => prevItems.filter((task) => task.id !== itemToAdd.id));
      return;
    }
  };

  return { canvasRef, modelerRef };
};
