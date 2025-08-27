import { StudioModeler } from '../utils/bpmnModeler/StudioModeler';

export const useTaskIds = (): string[] => {
  const studioModeler = new StudioModeler();
  const tasks = studioModeler.getAllTasksByType('bpmn:Task');

  return tasks.map((task) => task.id);
};
