import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { IDataModelFieldElement } from '../../types/global';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

export const useDatamodelQuery =
  (org: string, app: string): UseQueryResult<IDataModelFieldElement[]> => {
    const { getDatamodel } = useServicesContext();
    return useQuery<IDataModelFieldElement[]>(
      [QueryKey.Datamodel, org, app],
      () => getDatamodel(org, app).then((res) => {
        const dataModelFields: IDataModelFieldElement[] = [];
        Object.keys(res.elements).forEach((dataModelField) => {
          if (dataModelField) {
            dataModelFields.push(res.elements[dataModelField]);
          }
        });
        return dataModelFields;
      })
    );
  };
