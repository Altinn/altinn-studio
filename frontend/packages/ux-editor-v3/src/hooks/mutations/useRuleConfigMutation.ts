import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { RuleConfig } from 'app-shared/types/RuleConfig';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRuleConfigMutation = (org: string, app: string, layoutSetName: string) => {
  const { saveRuleConfig } = useServicesContext();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ruleConfig: RuleConfig) => {
      await saveRuleConfig(org, app, layoutSetName, ruleConfig);
      return ruleConfig;
    },
    onSuccess: (savedRuleConfig) => {
      client.setQueryData([QueryKey.RuleConfig, org, app, layoutSetName], savedRuleConfig);
    },
  });
};
