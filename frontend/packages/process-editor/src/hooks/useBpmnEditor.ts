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
  const { addLayoutSet, saveBpmn } = useBpmnApiContext();

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
  }, [bpmnXml, modelerRef, setBpmnDetails]);

  useEffect(() => {
    const modelerInstance: BpmnModeler = getModeler(canvasRef.current);
    const initializeBpmnChanges = () => {
      modelerInstance.on('commandStack.changed', async () => {
        // call saveBpmn from bpmnApiContext with updated xml and metadata?
        saveBpmn(await getUpdatedXml(), metaDataFormRef.current || null);
        resetForm();
      });

      modelerInstance.on('shape.add', (e: any) => {
        const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
        if (bpmnDetails.type === BpmnTypeEnum.Task) {
          addLayoutSet({
            layoutSetIdToUpdate: bpmnDetails.id,
            layoutSetConfig: { id: bpmnDetails.id, tasks: [bpmnDetails.id] },
          });
        }
      });

      modelerInstance.on('shape.remove', (e: any) => {
        const bpmnDetails = getBpmnEditorDetailsFromBusinessObject(e?.element?.businessObject);
        if (bpmnDetails.type === BpmnTypeEnum.Task) {
          // call remove layout set from bpmnApiContext. Make sure potentially updated task-id
          // from metadata is used in order to remove correct connection in app-metadata
        }
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

    initializeBpmnChanges();
  }, []);

  return { canvasRef, modelerRef };
};
