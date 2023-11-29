import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { useCurrentDataModelName } from 'src/features/datamodel/useBindingSchema';
import { useLaxInstance } from 'src/features/instance/InstanceContext';
import { useAppSelector } from 'src/hooks/useAppSelector';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { HttpClientError } from 'src/utils/network/sharedNetworking';

export const usePdfFormatQuery = (enabled: boolean): UseQueryResult<IPdfFormat> => {
  const { fetchPdfFormat } = useAppQueries();
  const formData = useAppSelector((state) => state.formData.formData);

  const instanceId = useLaxInstance()?.instanceId;
  const dataGuid = useCurrentDataModelName();

  const ready = typeof dataGuid === 'string';
  return useQuery(['fetchPdfFormat', instanceId, dataGuid, formData], () => fetchPdfFormat(instanceId!, dataGuid!), {
    enabled: enabled && ready,
    onError: (error: HttpClientError) => {
      window.logError('Fetching PDF format failed:\n', error);
    },
  });
};
