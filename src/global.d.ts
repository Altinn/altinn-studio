import type { ToolkitStore } from '@reduxjs/toolkit/src/configureStore';

import type { IFeatureTogglesOptionalMap } from 'src/features/toggles';
import type { IRuleObject, IRules, IRuntimeState } from 'src/types';

declare global {
  interface Window {
    app: string;
    instanceId: string | undefined;
    org: string;
    reportee: string;
    evalExpression: () => any;
    reduxStore: ToolkitStore<IRuntimeState>;
    reduxActionLog: any[];
    featureToggles: IFeatureTogglesOptionalMap;

    conditionalRuleHandlerObject: IRuleObject;
    conditionalRuleHandlerHelper: IRules;
    ruleHandlerObject: IRuleObject;
    ruleHandlerHelper: IRules;

    logError: (...args: any[]) => void;
    logWarn: (...args: any[]) => void;
    logInfo: (...args: any[]) => void;
  }
}
