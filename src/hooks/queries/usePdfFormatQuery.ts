import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { useAppSelector } from 'src/hooks/useAppSelector';
import { getCurrentTaskDataElementId } from 'src/utils/appMetadata';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const usePdfFormatQuery = (enabled: boolean): UseQueryResult<IPdfFormat> => {
  const { fetchPdfFormat } = useAppQueries();

  const layoutSets = useAppSelector((state) => state.formLayout.layoutsets);
  const instance = useAppSelector((state) => state.instanceData.instance);
  const applicationMetadata = useAppSelector((state) => state.applicationMetadata.applicationMetadata);
  const formData = useAppSelector((state) => state.formData.formData);

  const instanceId = instance?.id;
  const dataGuid = getCurrentTaskDataElementId(applicationMetadata, instance, layoutSets);

  const ready = typeof instanceId === 'string' && typeof dataGuid === 'string';
  return useQuery(['fetchPdfFormat', instanceId, dataGuid, formData], () => fetchPdfFormat(instanceId!, dataGuid!), {
    enabled: enabled && ready,
    onError: (error: HttpClientError) => {
      window.logError('Fetching PDF format failed:\n', error);
    },
  });
};
