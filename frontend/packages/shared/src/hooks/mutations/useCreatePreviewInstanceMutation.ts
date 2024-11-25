import { useMutation } from '@tanstack/react-query';
import { createPreviewInstance } from '../../api/mutations';

type CreatePreviewPayload = {
  partyId: number;
  taskId: string;
};

export const useCreatePreviewInstanceMutation = (org: string, app: string) => {
  return useMutation({
    mutationFn: ({ partyId, taskId }: CreatePreviewPayload) =>
      createPreviewInstance(org, app, partyId, taskId),
  });
};
