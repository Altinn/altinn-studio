import React, { useEffect } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { OldVersionError } from 'src/features/applicationMetadata/OldVersionError';
import { isAtLeastVersion } from 'src/utils/versionCompare';

export const MINIMUM_APPLICATION_VERSION = {
  build: '8.0.0.108',
  name: 'v8.0.0',
};

const useApplicationMetadataQuery = () => {
  const { fetchApplicationMetadata } = useAppQueries();
  const utils = useQuery({
    queryKey: ['fetchApplicationMetadata'],
    queryFn: () => fetchApplicationMetadata(),
  });

  useEffect(() => {
    utils.error && window.logError('Fetching application metadata failed:\n', utils.error);
  }, [utils.error]);

  return utils;
};

const { Provider, useCtx, useLaxCtx, useHasProvider } = delayedContext(() =>
  createQueryContext({
    name: 'ApplicationMetadata',
    required: true,
    query: useApplicationMetadataQuery,
  }),
);

function VerifyMinimumVersion({ children }: PropsWithChildren) {
  const { altinnNugetVersion } = useApplicationMetadata();
  if (
    !altinnNugetVersion ||
    !isAtLeastVersion({
      actualVersion: altinnNugetVersion,
      minimumVersion: MINIMUM_APPLICATION_VERSION.build,
      allowZeroInLast: true,
    })
  ) {
    return <OldVersionError minVer={MINIMUM_APPLICATION_VERSION.name} />;
  }

  return children;
}

export function ApplicationMetadataProvider({ children }: PropsWithChildren) {
  return (
    <Provider>
      <VerifyMinimumVersion>{children}</VerifyMinimumVersion>
    </Provider>
  );
}
export const useApplicationMetadata = () => useCtx();
export const useLaxApplicationMetadata = () => useLaxCtx();
export const useHasApplicationMetadata = () => useHasProvider();
