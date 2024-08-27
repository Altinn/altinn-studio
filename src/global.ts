import type { QueryClient } from '@tanstack/react-query';

import type { IAttachmentsMap } from 'src/features/attachments';
import type { IFeatureTogglesOptionalMap } from 'src/features/toggles';
import type { IRuleObject } from 'src/types';
import type { NodesContextStore } from 'src/utils/layout/NodesContext';

///<reference types="cypress-iframe" />

declare global {
  interface Window {
    app: string;
    org: string;
    featureToggles: IFeatureTogglesOptionalMap;

    // Exposes our global query client, which is used to cache data from API calls. This is exposed so that Cypress
    // can inject data into the cache, and so that we can access the cache in tests. It is also used by Studio
    // to invalidate/inject layout data the (Studio) user makes a change to the layout and wants to see the result
    // in the app preview. We cannot simply remove/rename this without making sure the Studio team has a plan to
    // replace that functionality with something else.
    queryClient: QueryClient;

    // Useful tooling and state when running in Cypress. We need to update state here in order for Cypress to be able
    // to read it in some tests.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Cypress?: any; // Can be used to test if we are running in Cypress
    CypressState?: {
      attachments?: IAttachmentsMap;
      formData?: object;
      nodesStore?: NodesContextStore;
    };

    // This may be used to log stuff, which may or may not be saved to a file when a cypress test ends. The purpose
    // of this is to debug functionality in app-frontend, and log events to a file if something fails (even if it is
    // not covered by the cypress test itself). This can be used during development, but code calling this should
    // probably be removed before merging to main. The use-case this was developed for was to log form data changes
    // while running tests, and saving the log to a file if an unexpected patch application was found.
    CypressLog?: (...args: string[]) => void;
    CypressSaveLog?: () => void;

    // Used to indicate that we are running in a unit test. Do not check this unless you really need to.
    inUnitTest?: boolean;

    // Allows forcing node properties validation always-on or always-off (defaults to auto-detection)
    forceNodePropertiesValidation: undefined | 'on' | 'off';

    conditionalRuleHandlerObject: IRuleObject;
    ruleHandlerObject: IRuleObject;

    /**
     * In React components, hierarchy generators, or other places that are run continuously, use window.logErrorOnce() instead
     * @see window.logErrorOnce
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logError: (...args: any[]) => void;
    /**
     * In React components, hierarchy generators, or other places that are run continuously, use window.logWarnOnce() instead
     * @see window.logWarnOnce
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logWarn: (...args: any[]) => void;
    /**
     * In React components, hierarchy generators, or other places that are run continuously, use window.logInfoOnce() instead
     * @see window.logInfoOnce
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logInfo: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logErrorOnce: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    logWarnOnce: (...args: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
