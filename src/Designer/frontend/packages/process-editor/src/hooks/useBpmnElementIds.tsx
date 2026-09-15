import { StudioModeler } from '../utils/bpmnModeler/StudioModeler';

export const useBpmnElementIds = (): string[] => {
  const studioModeler = new StudioModeler();

  return studioModeler.getAllElementIds();
};
