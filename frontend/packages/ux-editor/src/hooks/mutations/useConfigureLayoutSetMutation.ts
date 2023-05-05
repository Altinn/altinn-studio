import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { queryClient, useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';
import {FormLayoutActions} from "../../features/formDesigner/formLayout/formLayoutSlice";

export const useConfigureLayoutSetMutation = (org: string, app: string) => {
  const { createLayoutSet } = useServicesContext();
  const dispatch = useDispatch();

  return useMutation({

    mutationFn: () => createLayoutSet(org, app),

    onSuccess: (layoutSets) => {

      const selectedLayoutSet = layoutSets?.sets[0].id;
      dispatch(FormLayoutActions.updateSelectedLayoutSet(selectedLayoutSet));

      queryClient.setQueryData(
        [QueryKey.LayoutSets, org, app],
        () => layoutSets
      );
    }
  });
}
