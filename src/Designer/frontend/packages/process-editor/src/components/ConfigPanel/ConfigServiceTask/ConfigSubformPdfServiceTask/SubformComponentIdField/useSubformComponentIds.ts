import { useQuery } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { useBpmnApiContext } from '../../../../../contexts/BpmnApiContext';
import { useCurrentLayoutSet } from '../../../../../hooks/useCurrentLayoutSet';
import { getSubformComponentIds, getSubformLayoutSetIdsForDataType } from './subformComponentUtils';

export type UseSubformComponentIdsResult = {
  /** The Subform components the task can be pointed at, empty when there are none to offer. */
  subformComponentIds: string[];
};

/**
 * The component ids a subform pdf task can be pointed at.
 *
 * Exactly one layout set is searched: the one named after the task itself. The runtime renders the
 * pdf by opening `…/{taskId}/subform/{componentId}/{dataElementId}`, and the app frontend takes the
 * ui folder from that url's task id (`useCurrentUiFolderNameFromUrl`) before resolving the component
 * id inside it (`component.route.tsx`). A Subform component in any other layout set is therefore an
 * id the runtime cannot find, however plausible it looks in the picker.
 *
 * The chosen data type narrows it further: only components opening a subform that stores that data
 * type produce the pdf the task asks for.
 *
 * The query carries the untouched response rather than the ux editor's internal layout model, and
 * says so in the key: the ux editor owns `[FormLayouts, org, app, set]` and writes its own converted
 * model there, so two shapes must not meet under one key. Sharing the prefix still means an ux
 * editor change invalidates this entry too.
 * @param subformDataTypeId the data type the task is configured with.
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
