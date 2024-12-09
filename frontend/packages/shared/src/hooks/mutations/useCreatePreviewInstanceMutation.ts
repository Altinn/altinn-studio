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
  });
};
