import { MutableRefObject, useRef, useEffect } from 'react';
import BpmnJS from 'bpmn-js/dist/bpmn-navigated-viewer.development.js';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
};

export const useBpmnViewer = (bpmnXml: string): UseBpmnViewerResult => {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      console.log('Canvas reference is not yet available in the DOM.');
      return;
    }

    const viewer = new BpmnJS({ container: canvasRef.current });

    const initializeViewer = async () => {
      try {
        await viewer.importXML(bpmnXml);
      } catch (exception) {
        console.log('An error occurred while rendering the viewer:', exception);
      }
    };

    initializeViewer();
  }, [bpmnXml]);

  return { canvasRef };
};
