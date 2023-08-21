import { MutableRefObject, useRef, useEffect } from 'react';
import Modeler from 'bpmn-js/lib/Modeler';

import qaExtension from './qaExtension.json';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
};

export const useBpmnEditor = (bpmnXml: string): UseBpmnViewerResult => {
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!canvasRef.current) {
      console.log('Canvas reference is not yet available in the DOM.');
      return;
    }

    const modeler = new Modeler({
      moddleExtensions: {
        qa: qaExtension,
      },
      container: canvasRef.current,
      keyboard: {
        bindTo: document,
      },
    });

    const initializeEditor = async () => {
      try {
        await modeler.importXML(bpmnXml);
        const canvas: any = modeler.get('canvas');
        canvas.zoom('fit-viewport');
      } catch (exception) {
        console.log('An error occurred while rendering the viewer:', exception);
      }
    };

    initializeEditor();
  }, [bpmnXml]);

  return { canvasRef };
};
