import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DataModelFieldElement } from 'app-shared/types/DataModelFieldElement';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDataModelMetadataQuery = (
  org: string,
  app: string,
  layoutSetName: string,
  dataModelName: string,
): UseQueryResult<DataModelFieldElement[]> => {
  const { getDataModelMetadata } = useServicesContext();
  return useQuery<DataModelFieldElement[]>({
    queryKey: [QueryKey.DataModelMetadata, org, app, layoutSetName, dataModelName],
    queryFn: () =>
      getDataModelMetadata(org, app, layoutSetName, dataModelName).then((res) => {
        const dataModelFields: DataModelFieldElement[] = [];

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
