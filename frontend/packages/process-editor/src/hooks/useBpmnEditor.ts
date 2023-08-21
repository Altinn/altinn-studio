import { MutableRefObject, useRef, useEffect } from 'react';
import Modeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../palette';
import SupportedContextPadProvider from '../contextPad';

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
      container: canvasRef.current,
      keyboard: {
        bindTo: document,
      },
      additionalModules: [SupportedPaletteProvider, SupportedContextPadProvider],
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
