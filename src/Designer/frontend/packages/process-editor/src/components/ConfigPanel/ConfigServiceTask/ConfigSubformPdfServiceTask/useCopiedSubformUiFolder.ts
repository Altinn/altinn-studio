import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useBpmnApiContext } from '../../../../contexts/BpmnApiContext';

type LayoutComponent = {
  id?: string;
  type?: string;
  layoutSet?: string;
};

/**
 * Returns the UI folder that the copy of the Subform component in the task's own UI folder opens. Studio kept
 * that copy for a subform PDF task that named a Subform component, before the task named the subform's UI folder.
 * Reads the layouts only for a task that has a component id and a UI folder.
 */
export const useCopiedSubformUiFolder = (
  taskId: string,
  subformComponentId: string,
): string | undefined => {
  const { org, app } = useStudioEnvironmentParams();
  const { getFormLayouts } = useServicesContext();
  const { layoutSets } = useBpmnApiContext();
  const hasTaskUiFolder = Boolean(layoutSets?.some((layoutSet) => layoutSet.id === taskId));

  const { data: layouts } = useQuery({
    queryKey: [QueryKey.SubformPdfTaskLayouts, org, app, taskId],
    queryFn: () => getFormLayouts<LayoutComponent>(org, app, taskId),
    enabled: Boolean(subformComponentId) && hasTaskUiFolder,
  });

  if (!subformComponentId) return undefined;
  const copy = Object.values(layouts ?? {})
    .flatMap((layout) => layout?.data?.layout ?? [])
    .find((component) => component?.type === 'Subform' && component.id === subformComponentId);
  return copy?.layoutSet;
};
