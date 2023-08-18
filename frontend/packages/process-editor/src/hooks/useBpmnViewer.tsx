import React from 'react';
import { useEffect, useMemo, useState } from 'react';
import BpmnJS from 'bpmn-js/dist/bpmn-navigated-viewer.development.js';

// This hook is using any because of the BpmnJS has no types. The package is written in plain JS.

type UseBpmnViewerResult = {
  error?: any;
  warnings?: any;
  Viewer?: () => JSX.Element;
  setContainer?: (container: string) => void;
};
export const useBpmnViewer = (container: string, bpmnXml: string): UseBpmnViewerResult => {
  const [error, setError] = useState<any>();
  const [warnings, setWarnings] = useState<any>();
  const viewer = new BpmnJS({ container });

  const Viewer = () => {
    const [isLoading, setLoading] = useState(true);

    useEffect(() => {
      const initializeViewer = async () => {
        try {
          const { warnings: bpmnWarnings } = await viewer.importXML(bpmnXml);
          if (warnings.length) {
            setWarnings(bpmnWarnings);
          }
          setLoading(false);
        } catch (exception) {
          setLoading(false);
          setError(exception);
        }
      };

      initializeViewer();
    }, []);

    return <div>{isLoading ? 'Loading Diagram' : null}</div>;
  };

  return { error, warnings, Viewer };
};
