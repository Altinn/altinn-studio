import { QueryKey } from 'app-shared/types/QueryKey';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { toast } from 'react-toastify';

export const useRuleConfigQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<RuleConfig> => {
  const { getRuleConfig } = useServicesContext();
  return useQuery<RuleConfig>({
    queryKey: [QueryKey.RuleConfig, org, app, layoutSetName],
    queryFn: () =>
      getRuleConfig(org, app, layoutSetName)
        .then(
          (result) =>
            result || {
              data: {
                ruleConnection: {},
                conditionalRendering: {},
              },
            },
        )
        .catch((error) => {
          console.log('useRuleConfigQuery --- ', error);
          toast.error('useRuleConfigQuery --- ', error);

          return error;
        }),
  });
};
