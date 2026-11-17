import React, { useCallback, useState } from 'react';
import { useNavigation } from 'react-router';
import type { PropsWithChildren } from 'react';

import deepEqual from 'fast-deep-equal';

import { DisplayError } from 'src/core/errorHandling/DisplayError';
import { Loader } from 'src/core/loading/Loader';
import {
  useInstanceDataQuery,
  useInstancePollFailureCount,
  useInstantiation,
  useOptimisticallyUpdateInstance,
} from 'src/core/queries/instance';
import { useIsProcessNextPending, useIsProcessResumePending } from 'src/core/queries/process';
import { usePollingWithBackoff } from 'src/core/queries/usePollingWithBackoff';
import { FileScanResults } from 'src/features/attachments/types';
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
 * working view, especially the loader during a workflow transition where the poll loop recovers
 * by itself. Counted in cycles rather than wall-clock so a hidden tab does not escalate on its
 * first refetch after regaining focus.
 */
const INSTANCE_POLL_FAILURE_ESCALATION_CYCLES = 3;

export const InstanceProvider = ({ children }: PropsWithChildren) => {
  const instanceOwnerPartyId = useNavigationParam('instanceOwnerPartyId');
  const instanceGuid = useNavigationParam('instanceGuid');
  const instantiation = useInstantiation();
  const navigation = useNavigation();

  const hasPendingScans = useHasPendingScans();
  const workflowStatus = useWorkflowStatus();
  const isProcessNextPending = useIsProcessNextPending();
  const isProcessResumePending = useIsProcessResumePending();
  const shouldPollProcess = isProcessNextPending || isProcessResumePending || workflowStatus === 'processing';
  const pollFailureCount = useInstancePollFailureCount();
  const {
    error: instanceDataError,
    data,
    refetch,
  } = useInstanceDataQuery({
    // Process transitions use the shared fast-first backoff below. Pending scans retain their
    // simpler fixed cadence when no transition poll is already refreshing the same query.
    pollIntervalMs: !shouldPollProcess && hasPendingScans ? 5000 : false,
    refreshWhenFocused: shouldPollProcess || hasPendingScans,
  });
  const pollInstance = useCallback(async () => {
    await refetch();
  }, [refetch]);

  // A process/next response can take up to the backend's synchronous wait limit. Polling while the
  // mutation is pending lets the submitting tab discover server-side processing without replacing
  // the form during client validation. The same episode continues until processing settles, then
  // stops. A pending resume polls the same way, so a resumed workflow that keeps failing shows the
  // transition loader and its warnings instead of a spinning retry button.
  usePollingWithBackoff(pollInstance, shouldPollProcess, { initialIntervalMs: 250, initialAttempts: 20 });

  // The full-screen error is reserved for "nothing to render" (initial load failed) and "we've
  // been failing for a while" (sustained outage). A background refetch error while we hold
  // renderable data keeps the last known UI — during a workflow transition that keeps the
  // loading screen and its recovering poll loop alive instead of flashing an error page over a
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
