import { QueryKey } from 'app-shared/types/QueryKey';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { RuleConfig } from 'app-shared/types/RuleConfig';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';

export const useRuleConfigQuery = (org: string, app: string, layoutSetName: string): UseQueryResult<RuleConfig> => {
  const { getRuleConfig } = useServicesContext();
  return useQuery<RuleConfig>(
    [QueryKey.RuleConfig, org, app, layoutSetName],
    () => getRuleConfig(org, app, layoutSetName).then(result => result || { ruleConnection: {}, conditionalRendering: {} }),
  );
};
