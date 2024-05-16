import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { MutationMeta } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

interface CopyAppMutationArgs {
  org: string;
  app: string;
  newRepoName: string;
  newOrg: string;
}

export const useCopyAppMutation = (meta?: MutationMeta) => {
  const { copyApp } = useServicesContext();
  return useMutation({
    mutationFn: ({ org, app, newRepoName, newOrg }: CopyAppMutationArgs) =>
      copyApp(org, app, newRepoName, newOrg),
    meta,
  });
};
