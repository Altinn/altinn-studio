import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/queries/AppQueriesProvider';
import {
  brokerFileTransferOverviewQuery,
  brokerResourceConfigurationQuery,
  interruptedBrokerTransferQuery,
} from 'src/core/queries/brokerFileTransfer/brokerFileTransfer.queries';
import type { FileTransferOverview } from 'src/layout/BrokerFileTransfer/brokerClient/fileTransferStatus';
import type { ResourceConfiguration } from 'src/layout/BrokerFileTransfer/brokerClient/resourceConfiguration';
import type { InterruptedTransfer } from 'src/layout/BrokerFileTransfer/brokerClient/upload/interruptedTransfer';

// What BrokerFileTransfer reads from Altinn Broker: the resource's settings, a file transfer and an interrupted upload

type BrokerQueryResult<T> = { data: T | undefined; error: Error | null };

export function useBrokerResourceConfigurationQuery(
  baseUrl: string | undefined,
  resourceId: string,
): BrokerQueryResult<ResourceConfiguration> {
  const api = useAppQueries();
  const { data, error } = useQuery(brokerResourceConfigurationQuery(baseUrl, resourceId, api));
  return { data, error };
}

export function useInterruptedBrokerTransferQuery(
  baseUrl: string,
  fileTransferId: string | null,
): BrokerQueryResult<InterruptedTransfer> {
  const api = useAppQueries();
  const { data, error } = useQuery(interruptedBrokerTransferQuery(baseUrl, fileTransferId, api));
  return { data, error };
}

export function useBrokerFileTransferOverviewQuery(
  baseUrl: string | undefined,
  fileTransferId: string | undefined,
): BrokerQueryResult<FileTransferOverview> {
  const api = useAppQueries();
  const { data, error } = useQuery(brokerFileTransferOverviewQuery(baseUrl, fileTransferId, api));
  return { data, error };
}
