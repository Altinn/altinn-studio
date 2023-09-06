import { MutableRefObject, useRef, useEffect, useState } from 'react';
import BpmnJS from 'bpmn-js/dist/bpmn-navigated-viewer.development.js';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useTranslation } from 'react-i18next';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
  renderNoDiagramError: boolean;
  renderNoProcessError: boolean;
};

export const useBpmnViewer = (): UseBpmnViewerResult => {
  const { t } = useTranslation();
  const { bpmnXml } = useBpmnContext();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [renderNoDiagramError, setRenderNoDiagramError] = useState(false);
  const [renderNoProcessError, setRenderNoProcessError] = useState(false);

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
        if (exception.message === 'no diagram to display') {
          setRenderNoDiagramError(true);
          return renderNoDiagramError
        } else {
          if (exception.message === 'no process or collaboration to display') {
            setRenderNoProcessError(true);
            return renderNoProcessError
          }
          return;
        }
      }
    };

    initializeViewer();
  }, [bpmnXml, renderNoDiagramError, renderNoProcessError, t]);

  return { canvasRef, renderNoDiagramError, renderNoProcessError };
};
