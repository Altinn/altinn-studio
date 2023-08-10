import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useParams } from 'react-router-dom';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDeleteDatamodelMutation = () => {
  const { deleteDatamodel } = useServicesContext();
  const { org, app } = useParams<{ org: string; app: string }>();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (modelPath: string) => {
      await deleteDatamodel(org, app, modelPath);
      queryClient.setQueryData([QueryKey.Datamodel, org, app, modelPath], undefined);
      await queryClient.invalidateQueries([QueryKey.DatamodelsMetadata, org, app]);
    },
  })
}
