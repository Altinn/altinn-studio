import type { PayloadAction } from '@reduxjs/toolkit';

import type { user } from 'test/e2e/support/auth';

import type { ExprUnresolved } from 'src/features/expressions/types';
import type { ILayoutComponentOrGroup, ILayouts } from 'src/layout/layout';
import type { IRuntimeState } from 'src/types';

export type FrontendTestTask = 'message' | 'changename' | 'group' | 'likert' | 'datalist' | 'confirm';
export type GotoMode = 'fast' | 'with-data';

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Go to a certain task in the app, using either the fast mode or a mode where data is properly filled out.
       * Modes:
       *  - 'fast' will jump to the given task by injecting a minimal set of valid data to complete each previous task
       *  - 'with-data' will fill out proper/expected data, upload attachments, etc. Useful if you expect relatistic
       *    and complete data in the instance at the end.
       */
      goto(target: FrontendTestTask, mode: GotoMode = 'fast'): Chainable<Element>;

      /**
       * Go to a certain task and fill out the data in it. This behaves much like goto(), with key differences:
       * - It will only use the 'mode' for an tasks preceding the target one (if any). This means, if you
       *   gotoAndComplete('group', 'fast'), it will skip over the 'changeName' form using the fast mode (skipping
       *   form filling), but it will use the slower form-filling mode to complete the 'group' form.
       * - It won't send in the result, but stop on the last page in the task/layout set (usually a summary page). If
       *   you want to do that, call cy.sendIn() afterwards
       */
      gotoAndComplete(target: FrontendTestTask, mode: GotoMode = 'fast'): Chainable<Element>;

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
       * Send in the form just completed by gotoAndComplete(), and wait for the next task to render
       */
      sendIn(target?: FrontendTestTask): Chainable<Element>;

      /**
       * Reload the page and wait until the app has finished loading
       */
      reloadAndWait(): Chainable<null>;

      /**
       * Start an app instance based on the environment selected
       * @example cy.startAppInstance('appName')
       */
      startAppInstance(appName: string, user?: user | null): Chainable<Element>;

      /**
       * Add an item to group component with an item in nested group
       * @example cy.addItemToGroup(1, 2, 'automation')
       */
      addItemToGroup(oldValue: number, newValue: number, comment: string, openByDefault?: boolean): Chainable<Element>;

      /**
       * Test for WCAG violations of impact critical, serious, moderate
       * @example cy.testWcag()
       */
      testWcag(): Chainable<Element>;

      /**
       * Typings for axe/a11y plugin
       */
      injectAxe(): Chainable<null>;

      /**
       * Typings for a11y plugin
       */
      checkA11y(...args: any[]): Chainable<null>;

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
       * Instantiate statefull instance from ttd/stateless-app
       * @example cy.startStateFullFromStateless()
       */
      startStateFullFromStateless(): Chainable<Element>;

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
        mutator?: (component: ExprUnresolved<ILayoutComponentOrGroup>) => void,
        wholeLayoutMutator?: (layoutSet: any) => void,
      ): Chainable<null>;

      /**
       * The same as the above, but instead of intercepting the layout, it will fetch the current layout from redux
       * and apply the mutator to it. This is useful if you want to make changes to the layout after it has been
       * fetched. This performs the same actions as changing properties in the layout via the developer tools.
       */
      changeLayout(
        mutator?: (component: ExprUnresolved<ILayoutComponentOrGroup>) => void,
        allLayoutsMutator?: (layouts: ILayouts) => void,
      ): Chainable<null>;

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
    }
  }
}
