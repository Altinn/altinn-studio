import { type MutableRefObject, useEffect, useCallback, useRef } from 'react';
import type BpmnModeler from 'bpmn-js/lib/Modeler';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnModeler } from './useBpmnModeler';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/hookUtils';
import { useBpmnConfigPanelFormContext } from '../contexts/BpmnConfigPanelContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';
import { getLayoutSetIdFromTaskId } from '../utils/hookUtils/hookUtils';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
  modelerRef: MutableRefObject<BpmnModeler>;
};

export const useBpmnEditor = (): UseBpmnViewerResult => {
  const { getUpdatedXml, bpmnXml, modelerRef, setBpmnDetails } = useBpmnContext();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { metaDataFormRef, resetForm } = useBpmnConfigPanelFormContext();
  const { getModeler, destroyModeler } = useBpmnModeler();
  const { addLayoutSet, deleteLayoutSet, saveBpmn, layoutSets } = useBpmnApiContext();

  const handleCommandStackChanged = async () => {
    saveBpmn(await getUpdatedXml(), metaDataFormRef.current || null);
    resetForm();
  };

  const handleShapeAdd = (e) => {
    const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
    setBpmnDetails({
      ...bpmnDetails,
      element: e.element,
    });
    if (bpmnDetails.taskType === 'data') {
      addLayoutSet({
        layoutSetIdToUpdate: bpmnDetails.id,
        layoutSetConfig: { id: bpmnDetails.id, tasks: [bpmnDetails.id] },
      });
    }
  };

  const handleShapeRemove = (e) => {
    const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
    if (bpmnDetails.type === BpmnTypeEnum.Task) {
      const layoutSetId = getLayoutSetIdFromTaskId(bpmnDetails, layoutSets);
      if (layoutSetId) {
        deleteLayoutSet({
          layoutSetIdToUpdate: layoutSetId,
        });
      }
    }
    setBpmnDetails(null);
  };

  const handleSetBpmnDetails = useCallback(
    (e) => {
      const bpmnDetails = {
        ...getBpmnEditorDetailsFromBusinessObject(e.element?.businessObject),
        element: e.element,
      };
      setBpmnDetails(bpmnDetails);
    },
    [setBpmnDetails],
  );

  const initializeEditor = async () => {
    try {
      await modelerRef.current.importXML(bpmnXml);
      const canvas: any = modelerRef.current.get('canvas');
      canvas.zoom('fit-viewport');
    } catch (exception) {
      console.log('An error occurred while rendering the viewer:', exception);
    }
  };

  const initializeBpmnChanges = () => {
    modelerRef.current.on('commandStack.changed', async () => {
      await handleCommandStackChanged();
    });
    modelerRef.current.on('shape.add', (e) => {
      handleShapeAdd(e);
    });
    modelerRef.current.on('shape.remove', (e) => {
      handleShapeRemove(e);
    });
  };

  useEffect(() => {
    if (!canvasRef.current) {
      console.log('Canvas reference is not yet available in the DOM.');
      return;
    }

    modelerRef.current = getModeler(canvasRef.current);

    initializeEditor();
    initializeBpmnChanges();
    // set modelerRef.current to the Context so that it can be used in other components
  }, []); // Missing dependencies are not added to avoid getModeler to be called multiple times

  useEffect(() => {
    const eventBus: BpmnModeler = modelerRef.current.get('eventBus');
    eventBus.on('element.click', handleSetBpmnDetails);
  }, [modelerRef, handleSetBpmnDetails]);

  useEffect(() => {
    // Ensure to detach and destroys the modeller when it's unmounted
    return () => {
      destroyModeler();
    };
  }, []);

  return { canvasRef, modelerRef };
};
