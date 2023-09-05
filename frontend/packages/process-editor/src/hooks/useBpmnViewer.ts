import { MutableRefObject, useRef, useEffect, useState } from 'react';
import BpmnJS from 'bpmn-js/dist/bpmn-navigated-viewer.development.js';
import { useBpmnContext } from '../contexts/BpmnContext';
import { useTranslation } from 'react-i18next';

// Wrapper around bpmn-js to Reactify it

type UseBpmnViewerResult = {
  canvasRef: MutableRefObject<HTMLDivElement>;
  renderError: string | null;
};

export const useBpmnViewer = (): UseBpmnViewerResult => {
  const { t } = useTranslation();
  const { bpmnXml } = useBpmnContext();
  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

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
          setRenderError(t('process_editor.not_found_diagram_error_message'));
        } else {
          if (exception.message === 'no process or collaboration to display') {
            setRenderError(t('process_editor.not_found_process_error_message'));
          }
          return;
        }
      }
    };

    initializeViewer();
  }, [bpmnXml, t]);

  return { canvasRef, renderError };
};
