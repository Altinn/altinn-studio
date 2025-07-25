import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { QueryKey } from 'app-shared/types/QueryKey';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import type { CanUseFeature } from 'app-shared/types/api/CanUseFeatureResponse';
import type { FeatureName } from 'app-shared/enums/CanUseFeature';

export const useCanUseFeatureQuery = (featureName: FeatureName): UseQueryResult<CanUseFeature> => {
  const { canUseFeature } = useServicesContext();
  return useQuery({
    queryKey: [QueryKey.CanUseFeature, featureName],
    queryFn: () => canUseFeature(featureName),
  });
};
