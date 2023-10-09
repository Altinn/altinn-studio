import type { PayloadAction } from '@reduxjs/toolkit';

import type { user } from 'test/e2e/support/auth';

import type { ILayoutFileExternal } from 'src/layout/common.generated';
import type { CompOrGroupExternal, ILayouts } from 'src/layout/layout';
import type { ILayoutSets, IRuntimeState } from 'src/types';

export type FrontendTestTask = 'message' | 'changename' | 'group' | 'likert' | 'datalist' | 'confirm';
export type FillableFrontendTasks = Exclude<FrontendTestTask, 'message' | 'confirm'>;

export type StartAppInstanceOptions = {
  // User to log in as
  user?: user | null;

  // JavaScript code to evaluate before starting the app instance (evaluates in the browser, in context of the app).
  // The code runs inside an async function, and if it ends with a return value, that value will assumed to be a
  // URL that the app page should be navigated to.
  evaluateBefore?: string;
};

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Quickly go to a certain task in the app
       */
      goto(target: FrontendTestTask): Chainable<Element>;

      /**
       * Go to a certain task and fill out the data in it. This will skip ahead quickly to the correct task, and
       * then fill out the data in it. It will not move to the next task after it has filled out the data.
       */
      gotoAndComplete(target: FillableFrontendTasks): Chainable<Element>;

      /**
       * The worker behind gotoAndComplete. This will assume that the task has already been navigated to, and will
       * then fill out the data in it. It will not move to the next task after it has filled out the data.
       */
      fillOut(target: FillableFrontendTasks): Chainable<Element>;

      /**
       * Finds a navigation menu element with the specified text/page name
       */
      navPage(page: string): Chainable<Element>;

      /**
       * Finds and clicks a navigation menu element with the specified text/page name
       * Verifies that the page has changed
       */
      gotoNavPage(page: string): Chainable<Element>;

      /**
       * Reload the page and wait until the app has finished loading
       */
      reloadAndWait(): Chainable<null>;

      /**
       * Start an app instance based on the environment selected
       * @example cy.startAppInstance('appName')
       */
      startAppInstance(appName: string, options?: StartAppInstanceOptions): Chainable<Element>;

      /**
       * Add an item to group component with an item in nested group
       * @example cy.addItemToGroup(1, 2, 'automation')
       */
      addItemToGroup(oldValue: number, newValue: number, comment: string, openByDefault?: boolean): Chainable<Element>;

      /**
       * Typings for tab plugin
       */
      tab(...args: any[]): Chainable<null>;

      /**
       * Missing typings in Cypress, added here for proper TypeScript support
       */
      state(arg: 'window'): any;

      /**
       * Get body of ifram from the DOM
       * @example cy.getIframeBody()
       */
      getIframeBody(): Chainable<Element>;

      /**
       * check visibility of an element whose parent is found hidden by cypress
       */
      isVisible(): Chainable<Element>;

      /**
       * Instantiate stateful instance from ttd/stateless-app
       * @example cy.startStateFullFromStateless()
       */
      startStatefulFromStateless(): Chainable<Element>;

      /**
       * Force moving to the next task in the process
       */
      moveProcessNext(): Chainable<Element>;

      /**
       * Get the current redux state
       * @example cy.getReduxState((state) => state.formData).should('have.length', 3)
       */
      getReduxState(selector?: (state: IRuntimeState) => any): any;

      /**
       * Dispatch a redux action directly
       */
      reduxDispatch(action: PayloadAction<any>): any;

      /**
       * Allows you to intercept the fetched layout and make changes to it. This makes
       * it possible to add small adjustments to the layout not originally intended in
       * the app you're testing, such as marking some components as required, etc.
       * Must be called in the beginning of your test.
       */
      interceptLayout(
        taskName: FrontendTestTask | string,
        mutator?: (component: CompOrGroupExternal) => void,
        wholeLayoutMutator?: (layoutSet: { [pageName: string]: ILayoutFileExternal }) => void,
      ): Chainable<null>;

      /**
       * The same as the above, but instead of intercepting the layout, it will fetch the current layout from redux
       * and apply the mutator to it. This is useful if you want to make changes to the layout after it has been
       * fetched. This performs the same actions as changing properties in the layout via the developer tools.
       */
      changeLayout(
        mutator?: (component: CompOrGroupExternal) => void,
        allLayoutsMutator?: (layouts: ILayouts) => void,
      ): Chainable<null>;

      interceptLayoutSetsUiSettings(uiSettings: Partial<ILayoutSets['uiSettings']>): Chainable<null>;

      switchUser(user: user): any;
      assertUser(user: user): any;
      interceptPermissions(): void;
      setPermissions(permissionFormat: string): void;

      /**
       * Check a checkbox/radio from the design system.
       * Our design system radios/checkboxes are a little special, as they hide the HTML input element and provide
       * their own stylized variant. Cypress can't check/uncheck a hidden input field, and although we can tell
       * cypress to force it, that just circumvents a lot of other checks that we want cypress to run.
       */
      dsCheck(): Chainable<null>;

      /**
       * Uncheck a checkbox/radio from the design system. See the comment above for dsCheck()
       */
      dsUncheck(): Chainable<null>;

      /**
       * Select from a dropdown in the design system
       */
      dsSelect(name: string): Chainable<null>;

      /**
       * Shortcut for clicking an element and waiting for it to disappear
       */
      clickAndGone(): Chainable<null>;

      /**
       * Replace all non-breaking spaces with normal spaces in the subject
       */
      assertTextWithoutWhiteSpaces(expectedText: string): Chainable<null>;
      /**
       * Input fields with number formatting have a problem with cypress, as the .clear() command does not always
       * work. This command will forcibly clear the value of the input field, and should be used instead of .clear()
       * for number formatted input fields. Changes can be reverted after this problem is fixed in react-number-format.
       * @see https://github.com/s-yadav/react-number-format/issues/736
       */
      numberFormatClear(): Chainable<null>;

      /**
       * Snapshot the current visual state of the app. This does a few things:
       *  - It takes a screenshot of the app, compares that to the previous screenshot from earlier testing and notifies
       *    us of any changes (using Percy.io)
       *  - Runs the wcag tests on the app and notifies us of any violations (using axe/ally)
       *
       * You should make sure that:
       *  - The page you're looking at is what you expect to screenshot, and that no elements are
       *    currently loading or animating.
       *  - The snapshot does not overlap with other snapshots. Multiple snapshots on the same page in the same state
       *    will cause confusion, and eat up our Percy.io quota.
       *
       * @param name A unique name for the snapshot.
       */
      snapshot(name: string): Chainable<null>;

      /**
       * Runs the wcag tests on the app and notifies us of any violations (using axe/ally)
       */
      testWcag(): Chainable<null>;

      /**
       * Useful when taking snapshots; clear all selections and wait for the app to finish loading and stabilizing.
       */
      clearSelectionAndWait(viewport?: 'desktop' | 'tablet' | 'mobile'): Chainable<null>;

      getSummary(label: string): Chainable<Element>;
      testPdf(callback: () => void, returnToForm: boolean = false): Chainable<null>;
    }
  }
}
