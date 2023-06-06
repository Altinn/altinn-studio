import { useMutation } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { queryClient, useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';
import { FormLayoutActions } from "../../features/formDesigner/formLayout/formLayoutSlice";

export interface ConfigureLayoutSetMutationArgs {
  layoutSetName: string;
}

export const useConfigureLayoutSetMutation = (org: string, app: string) => {
  const { configureLayoutSet } = useServicesContext();
  const dispatch = useDispatch();

  return useMutation({

    mutationFn: ({ layoutSetName }: ConfigureLayoutSetMutationArgs) => configureLayoutSet(org, app, layoutSetName).then((layoutSets) => ({ layoutSetName, layoutSets })),

    onSuccess: ({ layoutSetName, layoutSets }) => {

      dispatch(FormLayoutActions.updateSelectedLayoutSet(layoutSetName));

      queryClient.setQueryData(
        [QueryKey.LayoutSets, org, app],
        () => layoutSets
      );
    }
  });
}
