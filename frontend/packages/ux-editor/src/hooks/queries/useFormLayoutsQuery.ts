import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { IFormLayouts } from '../../types/global';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { useDispatch } from 'react-redux';
import { QueryKey } from 'app-shared/types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';

export const useFormLayoutsQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<IFormLayouts> => {
  const { getFormLayouts } = useServicesContext();
  const dispatch = useDispatch();
  return useQuery({
    queryKey: [QueryKey.FormLayouts, org, app, layoutSetName],
    queryFn: () =>
      getFormLayouts(org, app, layoutSetName).then((formLayouts) => {
        const { convertedLayouts, invalidLayouts } =
          convertExternalLayoutsToInternalFormat(formLayouts);
        dispatch(FormLayoutActions.setInvalidLayouts(invalidLayouts));
        return convertedLayouts;
      }),
  });
};
