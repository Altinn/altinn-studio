import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/core/contexts/AppQueriesProvider';
import { delayedContext } from 'src/core/contexts/delayedContext';
import { createQueryContext } from 'src/core/contexts/queryContext';
import { useCurrentLayoutSetId } from 'src/features/form/layout/useCurrentLayoutSetId';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { getRuleModelFields } from 'src/utils/rules';

const RULES_SCRIPT_ID = 'rules-script';

const useRulesQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchRuleHandler } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  return useQuery({
    queryKey: ['fetchRules', layoutSetId],
    queryFn: () => fetchRuleHandler(layoutSetId),
    onSuccess: (ruleModel) => {
      clearExistingRules();
      if (ruleModel) {
        const rulesScript = window.document.createElement('script');
        rulesScript.innerHTML = ruleModel;
        rulesScript.id = RULES_SCRIPT_ID;
        window.document.body.appendChild(rulesScript);
        const ruleModelFields = getRuleModelFields();

        dispatch(FormRulesActions.fetchFulfilled({ ruleModel: ruleModelFields }));
      }
    },
    onError: (error: AxiosError) => {
      clearExistingRules();
      window.logError('Fetching RuleHandler failed:\n', error);
    },
  });
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
