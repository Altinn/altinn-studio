import { useQuery, UseQueryResult } from '@tanstack/react-query';
import { IRuleModelFieldElement } from '../../types/global';
import { useServicesContext } from 'app-shared/contexts/ServicesContext';
import { QueryKey } from 'app-shared/types/QueryKey';

export const useRuleModelQuery = (
  org: string,
  app: string,
  layoutSetName: string,
): UseQueryResult<IRuleModelFieldElement[]> => {
  const { getRuleModel } = useServicesContext();
  return useQuery<IRuleModelFieldElement[]>({
    queryKey: [QueryKey.RuleHandler, org, app, layoutSetName],
    queryFn: () =>
      getRuleModel(org, app, layoutSetName).then((ruleModel) => {
        const ruleModelFields: IRuleModelFieldElement[] = [];

        // Add script file to DOM to make it possible to read from it
        const scriptFile = window.document.createElement('script');
        scriptFile.innerHTML = ruleModel;
        window.document.body.appendChild(scriptFile);

        // Get the objects from the script file
        const {
          ruleHandlerObject,
          conditionalRuleHandlerObject,
          ruleHandlerHelper,
          conditionalRuleHandlerHelper,
        } = window as unknown as {
          ruleHandlerObject: object;
          conditionalRuleHandlerObject: object;
          ruleHandlerHelper: object;
          conditionalRuleHandlerHelper: object;
        };

        // Add the rule handler functions to the rule model
        if (ruleHandlerObject) {
          Object.keys(ruleHandlerObject).forEach((functionName) => {
            if (typeof ruleHandlerHelper[functionName] === 'function') {
              const innerFuncObj: IRuleModelFieldElement = {
                name: functionName,
                inputs: ruleHandlerHelper[functionName](),
                type: 'rule',
              };
              ruleModelFields.push(innerFuncObj);
            }
          });
        }

        // Add the conditional rule handler functions to the rule model
        if (conditionalRuleHandlerObject) {
          Object.keys(conditionalRuleHandlerObject).forEach((functionName) => {
            if (typeof conditionalRuleHandlerHelper[functionName] === 'function') {
              const innerFuncObj: IRuleModelFieldElement = {
                name: functionName,
                inputs: conditionalRuleHandlerHelper[functionName](),
                type: 'condition',
              };
              ruleModelFields.push(innerFuncObj);
            }
          });
        }

        return ruleModelFields;
      }),
  });
};
