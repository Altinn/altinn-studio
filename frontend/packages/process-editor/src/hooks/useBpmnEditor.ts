import { MutableRefObject, useRef, useEffect } from 'react';
import Modeler from 'bpmn-js/lib/Modeler';
import SupportedContextPadProvider from '../bpmnProviders/SupportedContextPadProvider';
import SupportedPaletteProvider from '../bpmnProviders/SupportedPaletteProvider';
import { useBpmnContext } from '../contexts/BpmnContext';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
  modelerRef: MutableRefObject<Modeler>;
};

export const useBpmnEditor = (): UseBpmnViewerResult => {
  const { bpmnXml, modelerRef, setNumberOfUnsavedChanges } = useBpmnContext();
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

    // set modelerRef.current to the Context so that it can be used in other components
    modelerRef.current = modeler;

    const initializeUnsavedChangesCount = () => {
      modeler.on('commandStack.changed', () => {
        setNumberOfUnsavedChanges((prevCount) => prevCount + 1);
      });
    };

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
    initializeUnsavedChangesCount();
  }, [bpmnXml, modelerRef, setNumberOfUnsavedChanges]);

  return { canvasRef, modelerRef };
};
