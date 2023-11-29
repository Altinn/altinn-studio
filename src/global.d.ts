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

    /**
     * In React components, hierarchy generators, or other places that are run continuously, use window.logErrorOnce() instead
     * @see window.logErrorOnce
     */
    logError: (...args: any[]) => void;
    /**
     * In React components, hierarchy generators, or other places that are run continuously, use window.logWarnOnce() instead
     * @see window.logWarnOnce
     */
    logWarn: (...args: any[]) => void;
    /**
     * In React components, hierarchy generators, or other places that are run continuously, use window.logInfoOnce() instead
     * @see window.logInfoOnce
     */
    logInfo: (...args: any[]) => void;
    logErrorOnce: (...args: any[]) => void;
    logWarnOnce: (...args: any[]) => void;
    logInfoOnce: (...args: any[]) => void;
  }
}

declare module '@material-ui/core/styles/createTheme' {
  interface Theme {
    accessibility: {
      focusVisible: {
        border: string;
      };
    };
    altinnPalette: {
      primary: {
        blueDarker: string;
        blueDark: string;
        blueDarkHover: string;
        blueMedium: string;
        blue: string;
        blueHover: string;
        blueLight: string;
        blueLighter: string;
        green: string;
        greenHover: string;
        greenLight: string;
        red: string;
        redLight: string;
        purple: string;
        purpleLight: string;
        yellow: string;
        yellowLight: string;
        black: string;
        grey: string;
        greyMedium: string;
        greyLight: string;
        white: string;
      };
    };
    sharedStyles: {
      boxShadow: string;
      linkBorderBottom: string;
      noLinkBorderBottom: string;
      mainPaddingLeft: number;
      leftDrawerMenuClosedWidth: number;
      fontWeight: {
        medium: number;
      };
    };
  }
}
