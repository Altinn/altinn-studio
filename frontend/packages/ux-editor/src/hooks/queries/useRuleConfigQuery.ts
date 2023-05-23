import { QueryKey } from 'app-shared/types/QueryKey';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { RuleConfig } from 'app-shared/types/RuleConfig';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useRuleConfigQuery = (org: string, app: string): UseQueryResult<RuleConfig> => {
  const { getRuleConfig } = useServicesContext();
  return useQuery<RuleConfig>(
    [QueryKey.RuleConfig, org, app],
    () => getRuleConfig(org, app).then(result => result || { ruleConnection: {}, conditionalRendering: {} }),
  );
};
