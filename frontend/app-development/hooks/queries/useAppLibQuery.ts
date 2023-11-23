import { useQuery } from '@tanstack/react-query';
import { getAppLibVersion } from 'app-shared/api/queries';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useAppLibQuery = (org: string, repo: string) => {
  return useQuery<{ version: string }>([QueryKey.AppLibVersion, org, repo], () =>
    getAppLibVersion(org, repo),
  );
};
