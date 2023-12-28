import { useMemo } from 'react';

import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentLayoutSetId } from 'src/features/form/layoutSets/useCurrentLayoutSetId';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { getRuleModelFields } from 'src/utils/rules';

const RULES_SCRIPT_ID = 'rules-script';

const useRulesQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchRuleHandler } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  const utils = useQuery({
    queryKey: ['fetchRules', layoutSetId],
    queryFn: () => fetchRuleHandler(layoutSetId),
    onError: (error: AxiosError) => {
      clearExistingRules();
      window.logError('Fetching RuleHandler failed:\n', error);
    },
  });

  const ruleModelFields = useMemo(() => {
    if (utils.data) {
      clearExistingRules();
      const rulesScript = window.document.createElement('script');
      rulesScript.innerHTML = utils.data;
      rulesScript.id = RULES_SCRIPT_ID;
      window.document.body.appendChild(rulesScript);
      const ruleModelFields = getRuleModelFields();

      dispatch(FormRulesActions.fetchFulfilled({ ruleModel: ruleModelFields }));
      return ruleModelFields;
    }

    return null;
  }, [dispatch, utils.data]);

  return {
    ...utils,
    data: ruleModelFields,
  };
};

function clearExistingRules() {
  const rulesScript = document.getElementById(RULES_SCRIPT_ID);
  if (rulesScript) {
    rulesScript.remove();
  }
}

const { Provider, useCtx } = delayedContext(() =>
  createQueryContext({
    name: 'RulesContext',
    required: true,
    query: useRulesQuery,
  }),
);

export const RulesProvider = Provider;
export const useRuleModelFields = () => useCtx();
