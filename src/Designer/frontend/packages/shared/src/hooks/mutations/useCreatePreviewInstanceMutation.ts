import { useMutation } from '@tanstack/react-query';
import { useServicesContext } from '../../contexts/ServicesContext';

type CreatePreviewPayload = {
  partyId: number;
  taskId: string;
};

export const useCreatePreviewInstanceMutation = (org: string, app: string) => {
  const { createPreviewInstance } = useServicesContext();
  return useMutation({
    mutationFn: ({ partyId, taskId }: CreatePreviewPayload) =>
      createPreviewInstance(org, app, partyId, taskId),
    // The instance lives in the preview, not in the user's copy of the repository.
    meta: { leavesRepoUnchanged: true },
  });
};
