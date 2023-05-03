import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { IFormLayouts } from '../../types/global';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { useDispatch } from 'react-redux';
import { QueryKey } from '../../types/QueryKey';
import { convertExternalLayoutsToInternalFormat } from '../../utils/formLayoutsUtils';

export const useFormLayoutsQuery =
  (org: string, app: string): UseQueryResult<IFormLayouts> => {
    const { getFormLayouts } = useServicesContext();
    const dispatch = useDispatch();
    return useQuery(
      [QueryKey.FormLayouts, org, app],
      () => getFormLayouts(org, app).then((formLayouts) => {
        const { convertedLayouts, invalidLayouts } = convertExternalLayoutsToInternalFormat(formLayouts);
        dispatch(FormLayoutActions.setInvalidLayouts(invalidLayouts));
        return convertedLayouts;
      })
    );
  }
