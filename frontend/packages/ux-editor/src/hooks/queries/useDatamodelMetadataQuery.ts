import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { DatamodelFieldElement } from 'app-shared/types/DatamodelFieldElement';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useDatamodelMetadataQuery =
  (org: string, app: string): UseQueryResult<DatamodelFieldElement[]> => {
    const { getDatamodelMetadata } = useServicesContext();
    return useQuery<DatamodelFieldElement[]>(
      [QueryKey.DatamodelMetadata, org, app],
      () => getDatamodelMetadata(org, app).then((res) => {
        const dataModelFields: DatamodelFieldElement[] = [];
        Object.keys(res.elements).forEach((dataModelField) => {
          if (dataModelField) {
            dataModelFields.push(res.elements[dataModelField]);
          }
        });
        return dataModelFields;
      }),
      { staleTime: 1000 }
    );
  };
