import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

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
    queryFn: () => (layoutSetId ? fetchRuleHandler(layoutSetId) : null),
  };
}

const useRulesQuery = () => {
  const layoutSetId = useCurrentLayoutSetId();

  const query = useQuery(useRulesQueryDef(layoutSetId));

  useEffect(() => {
    if (query.error) {
      clearExistingRules();
      window.logError('Fetching RuleHandler failed:\n', query.error);
    }
  }, [query.error]);

  useEffect(() => {
    clearExistingRules();
    if (query.data) {
      const rulesScript = window.document.createElement('script');
      rulesScript.innerHTML = query.data;
      rulesScript.id = RULES_SCRIPT_ID;
      window.document.body.appendChild(rulesScript);
    }
  }, [query.data]);

  return query;
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
