import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDatamodelMetadataQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<DatamodelFieldElement[]> => {
  const { getDatamodelMetadata } = useServicesContext();
  return useQuery<DatamodelFieldElement[]>({
    queryKey: [QueryKey.DatamodelMetadata, org, app, layoutSetName],
    queryFn: () =>
      getDatamodelMetadata(org, app, layoutSetName).then((res) => {
        const dataModelFields: DatamodelFieldElement[] = [];

        // Hack because we don't know if the response is upper or lower cased. Should be reverted once
        // https://github.com/Altinn/altinn-studio/pull/12457 is ready, this should fix the issue in the API.
        const response = res as unknown as any;
        const elements = response.elements || response.Elements; // End of hack.

        Object.keys(elements).forEach((dataModelField) => {
          if (dataModelField) {
            dataModelFields.push(elements[dataModelField]);
          }
        });
        return dataModelFields;
      }),
  });
};
