import { useEffect } from 'react';

import { useQuery } from '@tanstack/react-query';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';

const RULES_SCRIPT_ID = 'rules-script';

const useRulesQuery = () => {
  const { fetchRuleHandler } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  if (!layoutSetId) {
    throw new Error('No layoutSet id found');
  }

  const utils = useQuery({
    queryKey: ['fetchRules', layoutSetId],
    queryFn: () => fetchRuleHandler(layoutSetId),
  });

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
