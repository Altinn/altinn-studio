import type { QueryClient } from '@tanstack/react-query';

import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IAttachmentsMap } from 'src/features/attachments';
import type { IFooterLayout } from 'src/features/footer/types';
import type { IFeatureTogglesOptionalMap } from 'src/features/toggles';
import type { IAppLanguage, IApplicationSettings, IProfile } from 'src/types/shared';

///<reference types="cypress-iframe" />

type GlobalData = {
  applicationMetadata: ApplicationMetadata;
  footer: IFooterLayout;
  frontendSettings: IApplicationSettings;
  availableLanguages: IAppLanguage[];
  userProfile?: IProfile;
  returnUrl?: string;
};

declare global {
  interface Window {
    app: string;
    org: string;
    featureToggles: IFeatureTogglesOptionalMap;
    altinnAppGlobalData: GlobalData;
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
      dataElementIds?: { [dataType: string]: string | null };
      attachments?: IAttachmentsMap;
      formData?: { [key: string]: unknown };
    };

    // Calling this function will safely log to the Cypress log (if running in Cypress), without triggering a
    // test failure (which would happen if we used console.log()).
    CypressLog?: (...args: string[]) => void;

    // Used to indicate that we are running in a unit test. Do not check this unless you really need to.
    inUnitTest?: boolean;

    // Allows forcing node properties validation always-on or always-off (defaults to auto-detection)
    forceNodePropertiesValidation: undefined | 'on' | 'off';

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
