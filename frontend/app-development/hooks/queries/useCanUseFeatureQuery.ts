import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export type CanUseFeature = {
  canUseFeature: boolean;
};

export enum FeatureName {
  UploadDataModel = 'UploadDataModel',
}

export const useCanUseFeatureQuery = (featureName: FeatureName): UseQueryResult<CanUseFeature> => {
  const { canUseFeature } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.CanUseFeature, featureName],
    queryFn: () => canUseFeature(featureName),
  });
};
