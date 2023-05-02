import { QueryKey } from '../../types/QueryKey';
import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { RuleConfig } from '../../types/RuleConfig';
import { useServicesContext } from '../../../../../app-development/common/ServiceContext';

export const useRuleConfigQuery = (org: string, app: string): UseQueryResult<RuleConfig> => {
  const { getRuleConfig } = useServicesContext();
  return useQuery<RuleConfig>(
    [QueryKey.RuleConfig, org, app],
    () => getRuleConfig(org, app),
  );
};
