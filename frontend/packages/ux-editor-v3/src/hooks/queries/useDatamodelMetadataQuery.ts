import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import type { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDatamodelMetadataQuery = (
  org: string,
  app: string,
  layoutSetName: string,
  dataModelName: string,
): UseQueryResult<DatamodelFieldElement[]> => {
  const { getDatamodelMetadata } = useServicesContext();
  return useQuery<DatamodelFieldElement[]>({
    queryKey: [QueryKey.DatamodelMetadata, org, app, layoutSetName, dataModelName],
    queryFn: () =>
      getDatamodelMetadata(org, app, layoutSetName, dataModelName).then((res) => {
        const dataModelFields: DatamodelFieldElement[] = [];
        Object.keys(res.elements).forEach((dataModelField) => {
          if (dataModelField) {
            dataModelFields.push(res.elements[dataModelField]);
          }
        });
        return dataModelFields;
      }),
  });
};
