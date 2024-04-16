import type { MutableRefObject } from 'react';
import { useEffect, useRef } from 'react';
import type BpmnModeler from 'bpmn-js/lib/Modeler';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useBpmnModeler } from './useBpmnModeler';
import { getBpmnEditorDetailsFromBusinessObject } from '../utils/hookUtils';
import { useBpmnConfigPanelFormContext } from '../contexts/BpmnConfigPanelContext';
import { useBpmnApiContext } from '../contexts/BpmnApiContext';
import { BpmnTypeEnum } from '../enum/BpmnTypeEnum';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
  modelerRef: MutableRefObject<BpmnModeler>;
};

export const useBpmnEditor = (): UseBpmnViewerResult => {
  const { getUpdatedXml, bpmnXml, modelerRef, setBpmnDetails } = useBpmnContext();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const { metaDataFormRef, resetForm } = useBpmnConfigPanelFormContext();
  const { getModeler } = useBpmnModeler();
  const { addLayoutSet, deleteLayoutSet, saveBpmn } = useBpmnApiContext();

  const handleCommandStackChanged = async () => {
    saveBpmn(await getUpdatedXml(), metaDataFormRef.current || null);
    resetForm();
  };

  const handleShapeRemove = (e) => {
    const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
    if (bpmnDetails.type === BpmnTypeEnum.Task) {
      deleteLayoutSet({
        layoutSetIdToUpdate: bpmnDetails.id,
      });
    }
    setBpmnDetails(null);
  };

  const handleShapeAdd = (e) => {
    const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
    setBpmnDetails(bpmnDetails);
    if (bpmnDetails.type === BpmnTypeEnum.Task) {
      addLayoutSet({
        layoutSetIdToUpdate: bpmnDetails.id,
        layoutSetConfig: { id: bpmnDetails.id, tasks: [bpmnDetails.id] },
      });
    }
  };

  const handleSetBpmnDetails = (e) => {
    const bpmnDetails = {
      ...getBpmnEditorDetailsFromBusinessObject(e.element?.businessObject),
      element: e.element,
    };
    setBpmnDetails(bpmnDetails);
  };

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
      } catch (exception) {
        console.log('An error occurred while rendering the viewer:', exception);
      }
    };

    initializeEditor();
  }, [modelerRef]); // Missing dependencies are not added due to resulting wierd behaviour in the process editor

  useEffect(() => {
    const initializeBpmnChanges = () => {
      const modelerInstance = getModeler(canvasRef.current);

      modelerInstance.on('commandStack.changed', async () => {
        await handleCommandStackChanged();
      });

      modelerInstance.on('shape.add', (e) => {
        handleShapeAdd(e);
      });

      modelerInstance.on('shape.remove', (e) => {
        handleShapeRemove(e);
      });
    };

    initializeBpmnChanges();
  }, []); // Missing dependencies are not added due to resulting wierd behaviour in the process editor

  useEffect(() => {
    const modelerInstance: BpmnModeler = getModeler(canvasRef.current);
    const eventBus: BpmnModeler = modelerInstance.get('eventBus');
    eventBus.on('element.click', handleSetBpmnDetails);
  }, [getModeler, handleSetBpmnDetails]);

  return { canvasRef, modelerRef };
};
