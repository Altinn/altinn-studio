import type Modeler from 'bpmn-js/lib/Modeler';
import { StudioBpmnModeler } from '../../utils/StudioBpmnModeler';

type UseBpmnModelerResult = {
  getModeler: (canvasContainer: HTMLDivElement) => Modeler;
};

export const useBpmnModeler = (): UseBpmnModelerResult => {
  const getModeler = (canvasContainer: HTMLDivElement): Modeler => {
    return StudioBpmnModeler.getInstance(canvasContainer);
  };

  return {
    getModeler,
  };
};
