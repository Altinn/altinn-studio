import { useBpmnApiContext } from '../contexts/BpmnApiContext';

export const useTaskIds = (): string[] => {
  const { layoutSets } = useBpmnApiContext();
  const taskIds: string[] = layoutSets?.sets.flatMap((layoutSet) => layoutSet.tasks) ?? [];
  return taskIds;
};
