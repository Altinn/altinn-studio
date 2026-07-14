import React, { useCallback, useMemo, useState } from 'react';
import { useNavigation } from 'react-router';
import type { PropsWithChildren } from 'react';

import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query';
import deepEqual from 'fast-deep-equal';
import type { UseQueryOptions } from '@tanstack/react-query';

import { useInstanceApi } from 'src/core/contexts/ApiProvider';
import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import { invalidateInstanceData, useOptimisticallyUpdateInstance } from 'src/core/queries/instance';
import { instanceDataQuery, instanceQueryKeys } from 'src/core/queries/instance/instance.queries';
import { FileScanResults } from 'src/features/attachments/types';
import { useInstantiation } from 'src/features/instantiate/useInstantiation';
import { useInstanceOwnerParty } from 'src/features/party/PartiesProvider';
import { useNavigationParam } from 'src/hooks/navigation';
import { buildInstanceDataSources } from 'src/utils/instanceDataSources';
import type { IData, IInstance, IInstanceDataSources, WorkflowActivityStatus } from 'src/types/shared';

const emptyArray: never[] = [];
const InstanceContext = React.createContext<IInstance | null>(null);

/**
 * How many consecutive failed refetch cycles (each cycle already retries 3 times with backoff
 * internally) we tolerate while still holding renderable instance data, before replacing the UI
 * with the full error page. A transient blip or a single pod restart must not tear a user off a
 * working view — especially the "advancing" screen during a workflow transition, where the poll
 * loop recovers by itself. With the ~2–3s processing poll plus per-cycle retries this threshold
 * amounts to roughly 30–45s of continuous failure, at which point the outage is real and the
 * error page is honest. Counted in cycles rather than wall-clock so a tab that was hidden (polling
 * pauses) doesn't blow through the threshold on its first refetch after refocus.
 */
export const INSTANCE_POLL_FAILURE_ESCALATION_CYCLES = 3;

/**
 * Number of consecutive failed instance refetch cycles since the last successful fetch.
 * 0 whenever the latest fetch succeeded (or nothing has failed since mount).
 */
export function useInstancePollFailureCount(): number {
  const { isError, errorUpdateCount, dataUpdatedAt } = useInstanceDataQuery();

  // Baseline the (monotonic) error count at the moment of the last successful fetch, so the
  // difference counts consecutive failures only. Any successful data write — a poll tick, a
  // mutation refetch, an optimistic setQueryData — bumps dataUpdatedAt and resets the baseline.
  const [baseline, setBaseline] = useState({ dataUpdatedAt, errorUpdateCount });
  if (baseline.dataUpdatedAt !== dataUpdatedAt) {
    setBaseline({ dataUpdatedAt, errorUpdateCount });
  }

  return isError ? errorUpdateCount - baseline.errorUpdateCount : 0;
}

export const InstanceProvider = ({ children }: PropsWithChildren) => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const instantiation = useInstantiation();
  const navigation = useNavigation();

  const hasPendingScans = useHasPendingScans();
  const workflowStatus = useWorkflowStatus();
  const pollFailureCount = useInstancePollFailureCount();
  const { error: instanceDataError, data } = useInstanceDataQuery({
    // Poll while a workflow transition is in flight (~2-3s) so we converge on the committed task once
    // it settles, and poll slowly while it is failed (~10-12s) so an ops-driven resume converges this
    // page too — the failed screen deliberately offers no Retry (the engine already exhausted its
    // retry budget), which makes this poll the user's only recovery path. Otherwise fall back to the
    // slower pending-scans poll. Both workflow polls are jittered so many clients waiting on the same
    // engine don't synchronise into a thundering herd — which would otherwise peak exactly when the
    // engine is already slow.
    refetchInterval:
      workflowStatus === 'processing'
        ? () => 2000 + Math.floor(Math.random() * 1000)
        : workflowStatus === 'failed'
          ? () => 10000 + Math.floor(Math.random() * 2000)
          : hasPendingScans
            ? 5000
            : false,
  });

  // The full-screen error is reserved for "nothing to render" (initial load failed) and "we've
  // been failing for a while" (sustained outage). A background refetch error while we hold
  // renderable data keeps the last known UI — during a workflow transition that keeps the
  // advancing screen and its recovering poll loop alive instead of flashing an error page over a
  // transient blip. The fatal state is sticky (adjusted during render, per React's
  // adjust-state-on-change pattern): the error page itself mounts subscribers to the instance
  // query (e.g. <Lang> resolving instance data sources), and a mounting observer refetches an
  // errored no-data query, flipping it back to pending — without stickiness the UI would
  // flip-flop between the spinner and the error page on every retry cycle. A later successful
  // fetch clears the fatal state, so the error page auto-recovers when the backend comes back.
  const [fatalError, setFatalError] = useState<Error>();
  if (!fatalError && instanceDataError && (!data || pollFailureCount >= INSTANCE_POLL_FAILURE_ESCALATION_CYCLES)) {
    setFatalError(instanceDataError);
  }
  if (fatalError && data && !instanceDataError) {
    setFatalError(undefined);
  }

  if (!instanceOwnerPartyId || !instanceGuid) {
    throw new Error('Missing instanceOwnerPartyId or instanceGuid when creating instance context');
  }

  if (instantiation.error) {
    return <DisplayError error={instantiation.error} />;
  }

  if (fatalError) {
    return <DisplayError error={fatalError} />;
  }

  if (instanceDataError) {
    window.logWarnOnce(
      `Instance refetch failed (cycle ${pollFailureCount} of ${INSTANCE_POLL_FAILURE_ESCALATION_CYCLES} tolerated); keeping last known instance data:`,
      instanceDataError,
    );
  }

  if (!data) {
    return <Loader reason='loading-instance' />;
  }

  if (navigation.state === 'loading') {
    return <Loader reason='navigating' />;
  }

  return <InstanceContext.Provider value={data}>{children}</InstanceContext.Provider>;
};

export const useLaxInstanceId = () => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  return instanceOwnerPartyId && instanceGuid ? `${instanceOwnerPartyId}/${instanceGuid}` : undefined;
};

export const useStrictInstanceId = () => {
  const instanceId = useLaxInstanceId();
  if (!instanceId) {
    throw new Error('Missing instanceOwnerPartyId or instanceGuid in URL');
  }

  return instanceId;
};

export type ChangeInstanceData = (callback: (instance: IInstance | undefined) => IInstance | undefined) => void;

export function useInstanceDataQueryArgs() {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');

  return { instanceOwnerPartyId, instanceGuid };
}

export function useInstanceDataQuery<R = IInstance>(
  queryOptions: Omit<UseQueryOptions<IInstance, Error, R>, 'queryKey' | 'queryFn'> = {},
) {
  const instanceApi = useInstanceApi();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();
  const hasParams = !!instanceOwnerPartyId && !!instanceGuid;

  return useQuery<IInstance, Error, R>({
    ...(hasParams
      ? instanceDataQuery({ instanceOwnerPartyId, instanceGuid, instanceApi })
      : {
          queryKey: [...instanceQueryKeys.all(), { instanceOwnerPartyId, instanceGuid }] as const,
          queryFn: skipToken,
        }),
    refetchOnWindowFocus: !!queryOptions.refetchInterval,
    select: queryOptions.select, // FIXME: somehow TS complains if this is not here
    ...queryOptions,
  });
}

export function useInstanceDataSources(): IInstanceDataSources | null {
  const instanceOwnerParty = useInstanceOwnerParty();
  return (
    useInstanceDataQuery({
      select: (instance) => buildInstanceDataSources(instance, instanceOwnerParty),
    }).data ?? null
  );
}

export const useDataElementsSelector = () => {
  const dataElements = useInstanceDataQuery({ select: (instance) => instance.data }).data;

  return <U,>(selectDataElements: (data: IData[]) => U) =>
    dataElements ? selectDataElements(dataElements) : undefined;
};

/** Beware that in later versions, this will re-render your component after every save, as
 * the backend sends us updated instance data */
export const useInstanceDataElements = (dataType: string | undefined) =>
  useInstanceDataQuery({
    select: (instance) =>
      dataType ? instance.data.filter((dataElement) => dataElement.dataType === dataType) : instance.data,
  }).data ?? emptyArray;

/**
 * The live workflow status from the fetched instance, defaulting to `idle` when the backend did not
 * emit an annotation (older backend or opted-out read). Drives the provider's poll cadence.
 */
function useWorkflowStatus(): WorkflowActivityStatus {
  return useInstanceDataQuery({ select: (instance) => instance.process?.workflow?.status }).data ?? 'idle';
}

export function useHasPendingScans(): boolean {
  const dataElements = useInstanceDataQuery({ select: (instance) => instance.data }).data ?? [];
  if (dataElements.length === 0) {
    return false;
  }

  return dataElements.some((dataElement) => dataElement.fileScanResult === FileScanResults.Pending);
}

export function useInvalidateInstanceDataCache() {
  const queryClient = useQueryClient();

  return () => invalidateInstanceData(queryClient);
}

/*********************
 * OPTIMISTIC UPDATES
 *********************/

export const useOptimisticallyAppendDataElements = () => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (elements: IData[]) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: [...oldData.data, ...elements],
    }));
};
export const useOptimisticallyUpdateDataElement = () => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (elementId: string, mutator: (element: IData) => IData) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: oldData.data.map((element) => (element.id === elementId ? mutator(element) : element)),
    }));
};
export const useOptimisticallyRemoveDataElement = () => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (elementId: string) =>
    updateInstance((oldData) => ({
      ...oldData,
      data: oldData.data.filter((element) => element.id !== elementId),
    }));
};
export const useOptimisticallyUpdateCachedInstance = (): ChangeInstanceData => {
  const updateInstance = useOptimisticallyUpdateInstance();

  return (callback: (instance: IInstance | undefined) => IInstance | undefined) => {
    updateInstance((oldData) => {
      const next = callback(oldData);
      if (next && !deepEqual(oldData, next)) {
        return next;
      }
      return oldData;
    });
  };
};

export type InstanceDataSelector = <T>(selector: (instance: IInstance) => T) => T | undefined;

export const useSelectFromInstanceData = (): InstanceDataSelector => {
  const queryClient = useQueryClient();
  const { instanceOwnerPartyId, instanceGuid } = useInstanceDataQueryArgs();
  const instanceQueryKey = useMemo(
    () =>
      instanceOwnerPartyId && instanceGuid
        ? instanceQueryKeys.instance({ instanceOwnerPartyId, instanceGuid })
        : undefined,
    [instanceOwnerPartyId, instanceGuid],
  );

  return useCallback(
    <T,>(selector: (instance: IInstance) => T): T | undefined => {
      const instance = instanceQueryKey ? queryClient.getQueryData<IInstance>(instanceQueryKey) : undefined;
      return instance ? selector(instance) : undefined;
    },
    [instanceQueryKey, queryClient],
  );
};
