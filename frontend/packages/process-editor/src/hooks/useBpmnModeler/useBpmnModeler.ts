import { useEffect } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import SupportedPaletteProvider from '../../bpmnProviders/SupportedPaletteProvider';
import SupportedContextPadProvider from '../../bpmnProviders/SupportedContextPadProvider';
import { altinnCustomTasks } from '../../extensions/altinnCustomTasks';

// Save the instance outside React Ecosystem, ensures to not creating new instances between renders.
let modelerInstance: BpmnModeler | null = null;

type UseBpmnModelerResult = {
  getModeler: (canvasContainer: HTMLDivElement) => BpmnModeler;
};

export const useBpmnModeler = (): UseBpmnModelerResult => {
  useEffect(() => {
    // Kill/reset the modelerInstance on unMount
    return (): void => {
      modelerInstance = null;
    };
  }, []);
  const initializeModeler = (canvasContainer: HTMLDivElement) => {
    return new BpmnModeler({
      container: canvasContainer,
      keyboard: {
        bindTo: document,
      },
      additionalModules: [SupportedPaletteProvider, SupportedContextPadProvider],
      moddleExtensions: {
        altinn: altinnCustomTasks,
      },
    });
  };

  const getModeler = (canvasContainer: HTMLDivElement): BpmnModeler => {
    if (!modelerInstance) {
      modelerInstance = initializeModeler(canvasContainer);
    }
    return modelerInstance;
  };

  return {
    getModeler,
  };
};
