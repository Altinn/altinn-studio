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
        const elements = res.elements || res.Elements; // Hack because we don't know if the response is upper or lower cased
        console.log(elements);
        Object.keys(elements).forEach((dataModelField) => {
          if (dataModelField) {
            dataModelFields.push(elements[dataModelField]);
          }
        });
        return dataModelFields;
      }),
  });
};
