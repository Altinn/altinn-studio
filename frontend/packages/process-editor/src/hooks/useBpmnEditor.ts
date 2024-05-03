import type { MutableRefObject } from 'react';
import { useCallback, useEffect, useRef } from 'react';
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
  const { getModeler } = useBpmnModeler();
  const {
    addLayoutSet,
    deleteLayoutSet,
    addDataTypeToAppMetadata,
    deleteDataTypeFromAppMetadata,
    saveBpmn,
    layoutSets,
  } = useBpmnApiContext();

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
    if (bpmnDetails.taskType === 'payment') {
      addDataTypeToAppMetadata({
        dataTypeId: 'paymentInformation',
      });
    }
    if (bpmnDetails.taskType === 'signing') {
      addDataTypeToAppMetadata({
        dataTypeId: 'signingInformation',
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
    if (bpmnDetails.taskType === 'payment') {
      deleteDataTypeFromAppMetadata({
        dataTypeId: 'paymentInformation',
      });
    }
    if (bpmnDetails.taskType === 'signing') {
      deleteDataTypeFromAppMetadata({
        dataTypeId: 'signingInformation',
      });
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
    }
    // GetModeler can only be fetched from this hook once since the modeler creates a
    // new instance and will attach the same canvasRef container to all instances it fetches.
    // Set modelerRef.current to the Context so that it can be used in other components
    modelerRef.current = getModeler(canvasRef.current);
    initializeEditor();
    initializeBpmnChanges();
  }, []); // Missing dependencies are not added to avoid getModeler to be called multiple times

  useEffect(() => {
    const eventBus: BpmnModeler = modelerRef.current.get('eventBus');
    eventBus.on('element.click', handleSetBpmnDetails);
  }, [modelerRef, handleSetBpmnDetails]);

  return { canvasRef, modelerRef };
};
