import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { IFormLayouts } from '../../types/global';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { useLayoutSetsQuery } from 'app-shared/hooks/queries/useLayoutSetsQuery';

export const useFormLayoutsQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<IFormLayouts> => {
  const { getFormLayouts } = useServicesContext();
  const { data: layoutSets } = useLayoutSetsQuery(org, app);
  const layoutSetDatatype =
    layoutSetName && layoutSets.sets.find((layoutSet) => layoutSet.id === layoutSetName).dataType;

  return useQuery({
    queryKey: [QueryKey.FormLayouts, org, app, layoutSetName],
    queryFn: () =>
      getFormLayouts(org, app, layoutSetName).then((formLayouts) => {
        return convertExternalLayoutsToInternalFormat(formLayouts, layoutSetDatatype);
      }),
    enabled: Boolean(layoutSetName),
    staleTime: Infinity,
  });
};
