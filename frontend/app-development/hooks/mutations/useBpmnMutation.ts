import { useMutation } from '@tanstack/react-query';
import { updateBpmnXml } from 'app-shared/api/queries';

type UseBpmnMutationPayload = {
  bpmnXml: string;
  org: string;
  app: string;
};

export const useBpmnMutation = () => {
  return useMutation({
    mutationFn: ({ org, app, bpmnXml }: UseBpmnMutationPayload) =>
      updateBpmnXml(org, app, bpmnXml).then(() => bpmnXml),
  });
};
