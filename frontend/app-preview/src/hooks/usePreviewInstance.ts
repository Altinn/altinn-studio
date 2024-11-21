import { useCreatePreviewInstanceMutation } from 'app-shared/hooks/mutations/useCreatePreviewInstanceMutation';

export const usePreviewInstance = (org: string, app: string, partyId: number, taskId: string) => {
  const { mutate: createInstance } = useCreatePreviewInstanceMutation(org, app, partyId);
  const instance = createInstance(taskId);
  return instance;
};
