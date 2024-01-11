import type { QueryClient } from '@tanstack/react-query';

import type { IAttachments } from 'src/features/attachments';
import type { IFeatureTogglesOptionalMap } from 'src/features/toggles';
import type { IRuleObject } from 'src/types';

declare global {
  interface Window {
    app: string;
    org: string;
    featureToggles: IFeatureTogglesOptionalMap;

    // Exported into the Window object so that we can interact with it from Cypress tests
    queryClient: QueryClient;
    Cypress?: any; // Can be used to test if we are running in Cypress
    CypressState?: {
      attachments?: IAttachments;
      formData?: object;
    };

    // Used to indicate that we are running in a unit test. Do not check this unless you really need to.
    inUnitTest?: boolean;

    conditionalRuleHandlerObject: IRuleObject;
    ruleHandlerObject: IRuleObject;

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
