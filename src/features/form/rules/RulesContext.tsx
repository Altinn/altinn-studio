import React from 'react';

import { useQuery } from '@tanstack/react-query';
import type { AxiosError } from 'axios';

import { useAppQueries } from 'src/contexts/appQueriesContext';
import { useCurrentLayoutSetId } from 'src/features/form/layout/useCurrentLayoutSetId';
import { FormRulesActions } from 'src/features/form/rules/rulesSlice';
import { UnknownError } from 'src/features/instantiate/containers/UnknownError';
import { Loader } from 'src/features/loading/Loader';
import { useAppDispatch } from 'src/hooks/useAppDispatch';
import { createStrictContext } from 'src/utils/createContext';
import { getRuleModelFields } from 'src/utils/rules';

const RULES_SCRIPT_ID = 'rules-script';

const { Provider } = createStrictContext<undefined>({ name: 'RulesContext' });

const useRulesQuery = () => {
  const dispatch = useAppDispatch();
  const { fetchRuleHandler } = useAppQueries();
  const layoutSetId = useCurrentLayoutSetId();

  return useQuery(['fetchRules', layoutSetId], () => fetchRuleHandler(layoutSetId), {
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

export function RulesProvider({ children }: React.PropsWithChildren) {
  const query = useRulesQuery();

  if (query.error) {
    return <UnknownError />;
  }

  if (query.isFetching) {
    return <Loader reason='form-rules' />;
  }

  return <Provider value={undefined}>{children}</Provider>;
}
