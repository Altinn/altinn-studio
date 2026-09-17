import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useCurrentLayoutSet } from '../../../../../hooks/useCurrentLayoutSet';
import { getSubformComponentIds, getSubformLayoutSetIdsForDataType } from './subformComponentUtils';

export type UseSubformComponentIdsResult = {
  subformComponentIds: string[];
};

/**
 * The Subform components a subform pdf task can point at: those on the task's own pages (the app
 * frontend resolves the component id inside the ui folder named after the task) that open a
 * subform storing the chosen data type.
 *
 * The ux editor caches its converted layout model under `[FormLayouts, org, app, set]`, so the raw
 * response is cached under a key of its own.
 */
export const useSubformComponentIds = (subformDataTypeId: string): UseSubformComponentIdsResult => {
  const { org, app } = useStudioEnvironmentParams();
  const { layoutSets } = useBpmnApiContext();
  const { currentLayoutSet } = useCurrentLayoutSet();
  const { getFormLayouts } = useServicesContext();

  const subformLayoutSetIds = getSubformLayoutSetIdsForDataType(layoutSets, subformDataTypeId);
  const layoutSetId = currentLayoutSet?.id;

  const { data: formLayouts } = useQuery<FormLayoutsResponse>({
    queryKey: [QueryKey.FormLayouts, org, app, layoutSetId, 'external'],
    queryFn: () => getFormLayouts(org, app, layoutSetId),
    enabled: Boolean(layoutSetId) && subformLayoutSetIds.length > 0,
    staleTime: Infinity,
  });

  return { subformComponentIds: getSubformComponentIds(formLayouts, subformLayoutSetIds) };
};
