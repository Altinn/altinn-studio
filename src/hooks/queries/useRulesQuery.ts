import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { FormRulesActions } from 'src/features/formRules/rulesSlice';
import { useCurrentLayoutSetId } from 'src/features/layout/useLayouts';
import { QueueActions } from 'src/features/queue/queueSlice';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { getRuleModelFields } from 'src/utils/rules';

const RULES_SCRIPT_ID = 'rules-script';

export const useRulesQuery = (enabled: boolean): UseQueryResult<string | null> => {
  const dispatch = useAppDispatch();
  const { fetchRuleHandler } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  return useQuery(['fetchRules', layoutSetId], () => fetchRuleHandler(layoutSetId), {
    enabled,
    onSuccess: (ruleModel) => {
      clearExistingRules();
      if (ruleModel) {
        const rulesScript = window.document.createElement('script');
        rulesScript.innerHTML = ruleModel;
        rulesScript.id = RULES_SCRIPT_ID;
        window.document.body.appendChild(rulesScript);
        const ruleModelFields = getRuleModelFields();

        dispatch(FormRulesActions.fetchFulfilled({ ruleModel: ruleModelFields }));
      } else {
        dispatch(FormRulesActions.fetchRejected({ error: null }));
      }
    },
    onError: (error: AxiosError) => {
      clearExistingRules();
      dispatch(QueueActions.dataTaskQueueError({ error }));
      dispatch(FormRulesActions.fetchRejected({ error }));
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
