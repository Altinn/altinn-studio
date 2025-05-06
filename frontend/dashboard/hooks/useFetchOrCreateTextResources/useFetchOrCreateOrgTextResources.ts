import { useTextResourcesForOrgQuery } from 'app-shared/hooks/queries/useTextResourcesForOrgQuery';
import { useCreateTextResourcesForOrgMutation } from 'app-shared/hooks/mutations/useCreateTextResourcesForOrgMutation';
import { DEFAULT_LANGUAGE } from 'app-shared/constants';
import { useEffect } from 'react';
import type { MutationStatus, QueryStatus } from '@tanstack/react-query';

export function useFetchOrCreateOrgTextResources(orgName: string, language: string) {
  const { data: textResources, status: queryStatus } = useTextResourcesForOrgQuery(
    orgName,
    language,
  );
  const { mutate: createTextResource, status: mutationStatus } =
    useCreateTextResourcesForOrgMutation(orgName);

  useEffect(() => {
    if (queryStatus === 'success' && !textResources) {
      createTextResource(DEFAULT_LANGUAGE);
    }
  }, [queryStatus, createTextResource, textResources]);

  return {
    data: textResources,
    status: determineStatus(queryStatus, mutationStatus, !!textResources),
  };
}

export function determineStatus(
  queryStatus: QueryStatus,
  mutationStatus: MutationStatus,
  hasData: boolean,
): QueryStatus {
  if (queryStatus === 'error' || mutationStatus === 'error') return 'error';
  if (queryStatus === 'pending' || mutationStatus === 'pending') return 'pending';
  if (queryStatus === 'success' && mutationStatus === 'idle' && !hasData)
    return 'pending'; // prevents early return of success before createTextResource is called, when there is no data
  else return 'success';
}
