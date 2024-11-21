import { useMutation } from '@tanstack/react-query';
import { createPreviewInstance } from '../../api/mutations';

type CreatePreviewInstanceMutationPayload = {
  taskId: string;
  partyId: number;
};

export const useCreatePreviewInstanceMutation = (org: string, app: string) => {
  return useMutation({
    mutationFn: (payload: CreatePreviewInstanceMutationPayload) =>
      createPreviewInstance(org, app, payload.partyId, payload.taskId),
  });
};
