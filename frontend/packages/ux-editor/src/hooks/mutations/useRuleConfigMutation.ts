import { useMutation, useQueryClient } from '@tanstack/react-query';
import { RuleConfig } from '../../types/RuleConfig';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';
import { QueryKey } from '../../types/QueryKey';

export const useRuleConfigMutation = (org: string, app: string) => {
  const { saveRuleConfig } = useServicesContext();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (ruleConfig: RuleConfig) => {
      await saveRuleConfig(org, app, ruleConfig);
      return ruleConfig;
    },
    onSuccess: (savedRuleConfig) => {
      client.setQueryData([QueryKey.RuleConfig, org, app], savedRuleConfig);
    }
  })
}
