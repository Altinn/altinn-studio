import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { useMutation } from '@tanstack/react-query';

interface CopyAppMutationArgs {
  org: string;
  app: string;
  repoName: string;
}

export const useCopyAppMutation = () => {
  const { copyApp } = useServicesContext();
  return useMutation(({ org, app, repoName }: CopyAppMutationArgs) => copyApp(org, app, repoName));
};
