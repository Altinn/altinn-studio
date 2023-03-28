import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { IFormLayouts } from '../../types/global';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { convertFromLayoutToInternalFormat } from '../../utils/formLayout';
import { FormLayoutActions } from '../../features/formDesigner/formLayout/formLayoutSlice';
import { useDispatch } from 'react-redux';
import { QueryKey } from '../../types/QueryKey';

export const useFormLayoutsQuery =
  (org: string, app: string): UseQueryResult<IFormLayouts> => {
    const { getFormLayouts } = useServicesContext();
    const dispatch = useDispatch();
    return useQuery(
      [QueryKey.FormLayouts, org, app],
      () => getFormLayouts(org, app).then((formLayouts) => {
        const convertedLayouts: IFormLayouts = {};
        const invalidLayouts: string[] = [];
        Object.keys(formLayouts).forEach((layoutName: string) => {
          if (!formLayouts[layoutName] || !formLayouts[layoutName].data) {
            convertedLayouts[layoutName] = convertFromLayoutToInternalFormat(null, false);
          } else {
            try {
              convertedLayouts[layoutName] = convertFromLayoutToInternalFormat(
                formLayouts[layoutName].data.layout,
                formLayouts[layoutName]?.data?.hidden
              );
            } catch {
              invalidLayouts.push(layoutName);
            }
          }
        });
        dispatch(FormLayoutActions.setInvalidLayouts(invalidLayouts));
        dispatch(FormLayoutActions.deleteActiveListFulfilled());
        return convertedLayouts;
      })
    );
  }
