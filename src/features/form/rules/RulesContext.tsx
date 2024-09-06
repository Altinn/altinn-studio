import { useEffect } from 'react';

import { skipToken, useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSet';
import type { QueryDefinition } from 'src/core/queries/usePrefetchQuery';

const RULES_SCRIPT_ID = 'rules-script';

// Also used for prefetching @see formPrefetcher.ts
export function useRulesQueryDef(layoutSetId?: string): QueryDefinition<string | null> {
  const { fetchRuleHandler } = useAppQueries();
  return {
    queryKey: ['fetchRules', layoutSetId],
    queryFn: layoutSetId ? () => fetchRuleHandler(layoutSetId) : skipToken,
    enabled: !!layoutSetId,
  };
}

const useRulesQuery = () => {
  const layoutSetId = useCurrentLayoutSetId();

  if (!layoutSetId) {
    throw new Error('No layoutSet id found');
  }

  const utils = useQuery(useRulesQueryDef(layoutSetId));

  useEffect(() => {
    if (utils.error) {
      clearExistingRules();
      window.logError('Fetching RuleHandler failed:\n', utils.error);
    }
  }, [utils.error]);

  useEffect(() => {
    clearExistingRules();
    if (utils.data) {
      const rulesScript = window.document.createElement('script');
      rulesScript.innerHTML = utils.data;
      rulesScript.id = RULES_SCRIPT_ID;
      window.document.body.appendChild(rulesScript);
    }
  }, [utils.data]);

  return utils;
};

function clearExistingRules() {
  const rulesScript = document.getElementById(RULES_SCRIPT_ID);
  if (rulesScript) {
    rulesScript.remove();
  }
}

const { Provider } = delayedContext(() =>
  createQueryContext({
    name: 'RulesContext',
    required: true,
    query: useRulesQuery,
  }),
);

export const RulesProvider = Provider;
