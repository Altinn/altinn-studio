import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { IFormLayouts } from '../../types/global';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';
import { useAppContext } from '../../hooks/useAppContext';

export const useFormLayoutsQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<IFormLayouts> => {
  const { getFormLayouts } = useServicesContext();
  const { setInvalidLayouts } = useAppContext();
  return useQuery({
    queryKey: [QueryKey.FormLayouts, org, app, layoutSetName],
    queryFn: () =>
      getFormLayouts(org, app, layoutSetName).then((formLayouts) => {
        const { convertedLayouts, invalidLayouts } =
          convertExternalLayoutsToInternalFormat(formLayouts);
        setInvalidLayouts(invalidLayouts);
        return convertedLayouts;
      }),
    staleTime: Infinity,
  });
};
