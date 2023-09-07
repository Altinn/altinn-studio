import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { MutationMeta, useMutation } from '@tanstack/react-query';

interface CopyAppMutationArgs {
  org: string;
  app: string;
  repoName: string;
}

export const useCopyAppMutation = (meta?: MutationMeta) => {
  const { copyApp } = useServicesContext();
  return useMutation({
    mutationFn: ({ org, app, repoName }: CopyAppMutationArgs) => copyApp(org, app, repoName),
    meta,
  });
};
