import { useEffect, useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { QueryClient } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { layoutQueryDef } from 'src/core/queries/layouts/layouts.queries';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { makeLayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import { useCurrentUiFolderNameFromUrl } from 'src/features/form/ui/hooks';
import { useInstanceDataQuery, useLaxInstanceId } from 'src/features/instance/InstanceContext';
import { useProcessQuery } from 'src/features/instance/useProcessQuery';
import type { LayoutFetchFns } from 'src/core/queries/layouts/layouts.queries';
import type { LayoutLookups } from 'src/features/form/layout/makeLayoutLookups';
import type { ILayouts } from 'src/layout/layout';
import type { IExpandedWidthLayouts, IHiddenLayoutsExternal } from 'src/types';

export function prefetchLayouts(
  queryClient: QueryClient,
  enabled: boolean,
  defaultDataModelType: string,
  uiFolder: string | undefined,
  instanceId: string | undefined,
) {
  return queryClient.prefetchQuery(layoutQueryDef(enabled, defaultDataModelType, uiFolder, instanceId));
}

function useLayoutFetchFns(): LayoutFetchFns {
  const { fetchLayouts, fetchLayoutsForInstance } = useAppQueries();
  return useMemo(() => ({ fetchLayouts, fetchLayoutsForInstance }), [fetchLayouts, fetchLayoutsForInstance]);
}

function useLayoutQuery() {
  const { data: process } = useProcessQuery();
  const currentUiFolder = useCurrentUiFolderNameFromUrl();
  const defaultDataModel = useCurrentDataModelName() ?? 'unknown';
  const hasInstance = !!useInstanceDataQuery().data;
  const instanceId = useLaxInstanceId();
  const fetchFns = useLayoutFetchFns();

  const enabled = hasInstance ? !!process : true;

  const utils = useQuery(layoutQueryDef(enabled, defaultDataModel, currentUiFolder, instanceId, fetchFns));

  useEffect(() => {
    utils.error && window.logError('Fetching form layout failed:\n', utils.error);
  }, [utils.error]);

  return utils;
}

// Cached lookups — recomputed only when layouts reference changes
let cachedLookupsLayouts: ILayouts | undefined;
let cachedLookups: LayoutLookups | undefined;

function getOrComputeLookups(layouts: ILayouts): LayoutLookups {
  if (layouts !== cachedLookupsLayouts) {
    cachedLookupsLayouts = layouts;
    cachedLookups = makeLayoutLookups(layouts);
  }
  return cachedLookups!;
}

const emptyLayouts: ILayouts = {};
const noExpressions: IHiddenLayoutsExternal = {};

export function useLayouts(): ILayouts {
  const { data } = useLayoutQuery();
  return data?.layouts ?? emptyLayouts;
}

export function useLayoutLookups(): LayoutLookups {
  const { data } = useLayoutQuery();
  if (!data) {
    throw new Error('Layout data not available. useLayoutLookups must be used within a form context.');
  }
  return useMemo(() => getOrComputeLookups(data.layouts), [data.layouts]);
}

export function useLayoutLookupsLax(): LayoutLookups | undefined {
  const { data } = useLayoutQuery();
  return useMemo(() => (data ? getOrComputeLookups(data.layouts) : undefined), [data]);
}

export function useHiddenLayoutsExpressions(): IHiddenLayoutsExternal {
  const { data } = useLayoutQuery();
  return data?.hiddenLayoutsExpressions ?? noExpressions;
}

export function useExpandedWidthLayouts(): IExpandedWidthLayouts {
  const { data } = useLayoutQuery();
  if (!data) {
    throw new Error('Layout data not available. useExpandedWidthLayouts must be used within a form context.');
  }
  return data.expandedWidthLayouts;
}
