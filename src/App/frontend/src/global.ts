import type { QueryClient } from '@tanstack/react-query';

import type { ApplicationMetadata } from 'src/features/applicationMetadata/types';
import type { IAttachmentsMap } from 'src/features/attachments';
import type { IFooterLayout } from 'src/features/footer/types';
import type { ILayoutSets } from 'src/features/form/layoutSets/types';
import type { IFeatureTogglesOptionalMap } from 'src/features/toggles';
import type { IAppLanguage, IApplicationSettings } from 'src/types/shared';

///<reference types="cypress-iframe" />

export type AltinnAppGlobalData = {
  applicationMetadata: ApplicationMetadata;
  footer: IFooterLayout;
  layoutSets: ILayoutSets;
  frontendSettings: IApplicationSettings;
  availableLanguages: IAppLanguage[];
};

declare global {
  var app: string;
  var org: string;
  var featureToggles: IFeatureTogglesOptionalMap;
  var altinnAppGlobalData: AltinnAppGlobalData;

  // Exposes our global query client, which is used to cache data from API calls. This is exposed so that Cypress
  // can inject data into the cache, and so that we can access the cache in tests. It is also used by Studio
  // to invalidate/inject layout data the (Studio) user makes a change to the layout and wants to see the result
  // in the app preview. We cannot simply remove/rename this without making sure the Studio team has a plan to
  // replace that functionality with something else.
  var queryClient: QueryClient;

  // Useful tooling and state when running in Cypress. We need to update state here in order for Cypress to be able
  // to read it in some tests.

  var CypressState:
    | {
        dataElementIds?: { [dataType: string]: string | null };
        attachments?: IAttachmentsMap;
        formData?: { [key: string]: unknown };
      }
    | undefined;

  // Calling this function will safely log to the Cypress log (if running in Cypress), without triggering a
  // test failure (which would happen if we used console.log()).
  var CypressLog: ((...args: string[]) => void) | undefined;

  // Used to indicate that we are running in a unit test. Do not check this unless you really need to.
  var inUnitTest: boolean | undefined;

  // Allows forcing node properties validation always-on or always-off (defaults to auto-detection)
  var forceNodePropertiesValidation: undefined | 'on' | 'off';

  /**
   * In React components, hierarchy generators, or other places that are run continuously, use globalThis.logErrorOnce() instead
   * @see globalThis.logErrorOnce
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var logError: (...args: any[]) => void;
  /**
   * In React components, hierarchy generators, or other places that are run continuously, use globalThis.logWarnOnce() instead
   * @see globalThis.logWarnOnce
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var logWarn: (...args: any[]) => void;
  /**
   * In React components, hierarchy generators, or other places that are run continuously, use globalThis.logInfoOnce() instead
   * @see globalThis.logInfoOnce
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var logInfo: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var logErrorOnce: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var logWarnOnce: (...args: any[]) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  var logInfoOnce: (...args: any[]) => void;
}
