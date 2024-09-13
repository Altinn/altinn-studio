import { useQuery } from '@tanstack/react-query';
import type { QueryMeta, UseQueryResult } from '@tanstack/react-query';
import type { IFormLayouts } from '../../types/global';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';

export const useFormLayoutsQuery = (
  org: string,
  app: string,
  layoutSetName: string,
  meta?: QueryMeta,
): UseQueryResult<IFormLayouts> => {
  const { getFormLayouts } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.FormLayouts, org, app, layoutSetName],
    queryFn: () =>
      getFormLayouts(org, app, layoutSetName).then((formLayouts) => {
        return convertExternalLayoutsToInternalFormat(formLayouts);
      }),
    staleTime: Infinity,
    meta,
  });
};
