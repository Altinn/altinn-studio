import type { PayloadAction } from '@reduxjs/toolkit';

import type { ILayoutComponentOrGroup } from 'src/layout/layout';
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
      startAppInstance(appName: string, anonymous?: boolean): Chainable<Element>;

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
        mutator: (component: ILayoutComponentOrGroup) => void,
        wholeLayoutMutator?: (layoutSet: any) => void,
      ): Chainable<null>;
    }
  }
}
