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
        Object.keys(res.elements).forEach((dataModelField) => {
          if (dataModelField) {
            dataModelFields.push(res.elements[dataModelField]);
          }
        });
        return dataModelFields;
      }),
  });
};
