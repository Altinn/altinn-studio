/// <reference types="cypress" />
declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to get an altinnstudioruntime token for an app owner
     * @example cy.getTokenForOrg(ttd)
     */
    getTokenForOrg(orgname: string): Chainable<Element>;

    /**
     * Custom command to navigate to change name layout in task_2 in app: frontend-test
     * @example cy.navigateToChangeName()
     */
    navigateToChangeName(): Chainable<Element>;

    /**
     * Custom command to used in beforeeach that preserves cookies between tests
     * @example cy.preserveCookies()
     */
    preserveCookies(): Chainable<Element>;

    /**
     * Custom command to complete the change name form with supplied names and move to next page
     * @example cy.completeChangeNameForm('abc', 'xyz')
     */
    completeChangeNameForm(firstName: string, lastName: string): Chainable<Element>;

    /**
     * Start an app instance based on the environment selected
     * @example cy.startAppInstance('appName')
     */
    startAppInstance(appName: string, anonymous?: boolean): Chainable<Element>;

    /**
     * Navigate to the task3 of app ttd/frontend-test
     * @example cy.navigateToTask3()
     */
    navigateToTask3(): Chainable<Element>;

    /**
     * navigate to task 3 and complete task 3 form
     * @example cy.completeTask3Form()
     */
    completeTask3Form(): Chainable<Element>;

    /**
     * Puts data and waits for confirmation container to render
     * @example cy.sendAndWaitForConfirmation()
     */
    sendAndWaitForConfirmation(): Chainable<Element>;

    /**
     * Add an item to group component with an item in nested group
     * @example cy.addItemToGroup(1, 2, 'automation')
     */
    addItemToGroup(oldValue: Number, newValue: Number, comment: string, openByDefault?:boolean): Chainable<Element>;

    /**
     * Test for WCAG violations of impact critical, serious, moderate
     * @example cy.testWcag()
     */
    testWcag(): Chainable<Element>;

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
    getReduxState(selector?:(state:any)=>any):any;

    /**
     * Allows you to intercept the fetched layout and make changes to it. This makes
     * it possible to add small adjustments to the layout not originally intended in
     * the app you're testing, such as marking some components as required, etc.
     * Must be called in the beginning of your test.
     */
    interceptLayout(layoutName:string, mutator:(component:any) => any):Chainable<Element>;
  }
}
