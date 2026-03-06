import React, { useEffect, useMemo } from 'react';
import type { PropsWithChildren } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { layoutQueryDef } from 'src/core/queries/layouts/layouts.queries';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/ui/hooks';
import { useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import type { LayoutFetchFns } from 'src/core/queries/layouts/layouts.queries';

export function LayoutsProvider({ children }: PropsWithChildren) {
  const { data: process } = useProcessQuery();
  const currentUiFolder = useCurrentUiFolderNameFromUrl();
  const defaultDataModel = useCurrentDataModelName() ?? 'unknown';
  const hasInstance = !!useInstanceDataQuery().data;
  const instanceId = useLaxInstanceId();
  const { fetchLayouts, fetchLayoutsForInstance } = useAppQueries();
  const fetchFns: LayoutFetchFns = useMemo(
    () => ({ fetchLayouts, fetchLayoutsForInstance }),
    [fetchLayouts, fetchLayoutsForInstance],
  );

  const enabled = hasInstance ? !!process : true;

  const { isPending, error } = useQuery(
    layoutQueryDef(enabled, defaultDataModel, currentUiFolder, instanceId, fetchFns),
  );

  useEffect(() => {
    error && window.logError('Fetching form layout failed:\n', error);
  }, [error]);

  if (enabled && isPending) {
    return <Loader reason='query-LayoutsContext' />;
  }

  if (error) {
    return <DisplayError error={error} />;
  }

  return children;
}
