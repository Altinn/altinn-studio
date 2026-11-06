import { queryOptions, skipToken } from '@tanstack/react-query';

import { getPollingInterval } from 'src/core/queries/usePollingWithBackoff';
import { isSettledStatus } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import type { AppQueries } from 'src/core/queries/types';

export const brokerFileTransferQueryKeys = {
  all: ['brokerFileTransfer'] as const,
};

export const brokerResourceConfigurationQuery = (
  baseUrl: string | undefined,
  resourceId: string,
  api: Pick<AppQueries, 'fetchBrokerResourceConfiguration'>,
) =>
  queryOptions({
    queryKey: [...brokerFileTransferQueryKeys.all, 'resourceConfiguration', baseUrl, resourceId],
    queryFn: baseUrl && resourceId ? () => api.fetchBrokerResourceConfiguration(baseUrl, resourceId) : skipToken,
    staleTime: 1000 * 60 * 10,
  });

export const interruptedBrokerTransferQuery = (
  baseUrl: string,
  fileTransferId: string | null,
  api: Pick<AppQueries, 'fetchInterruptedBrokerTransfer'>,
) =>
  queryOptions({
    queryKey: [...brokerFileTransferQueryKeys.all, 'interruptedTransfer', baseUrl, fileTransferId],
    queryFn: fileTransferId
      ? ({ signal }) => api.fetchInterruptedBrokerTransfer(baseUrl, fileTransferId, signal)
      : skipToken,
    staleTime: 0,
    gcTime: 0,
  });

export const brokerFileTransferOverviewQuery = (
  baseUrl: string | undefined,
  fileTransferId: string | undefined,
  api: Pick<AppQueries, 'fetchBrokerFileTransferOverview'>,
) =>
  queryOptions({
    queryKey: [...brokerFileTransferQueryKeys.all, 'fileTransferOverview', baseUrl, fileTransferId],
    queryFn:
      baseUrl && fileTransferId
        ? ({ signal }) => api.fetchBrokerFileTransferOverview(baseUrl, fileTransferId, signal)
        : skipToken,
    refetchInterval: (query) =>
      query.state.data && !isSettledStatus(query.state.data.fileTransferStatus)
        ? getPollingInterval(query.state.dataUpdateCount - 1, 5000, 2)
        : false,
  });
