import type Modeler from 'bpmn-js/lib/Modeler';
import { BpmnModelerInstance } from '../../utils/bpmn/BpmnModelerInstance';

type UseBpmnModelerResult = {
  getModeler: (canvasContainer: HTMLDivElement) => Modeler;
};

export const useBpmnModeler = (): UseBpmnModelerResult => {
  const getModeler = (canvasContainer: HTMLDivElement): Modeler => {
    return BpmnModelerInstance.getInstance(canvasContainer);
  };

  return {
    getModeler,
  };
};
