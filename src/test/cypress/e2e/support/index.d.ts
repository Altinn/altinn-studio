declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to create an org using gitea api
     * @example cy.createorg(ttd, token)
     */
    createorg(orgname: string, token: string): Chainable<Element>;

    /**
     * Custom command to delete an org using gitea api
     * @example cy.deleteorg(ttd, token)
     */
    deleteorg(orgname: string, token: string): Chainable<Element>;

    /**
     * Custom command to delete all apps of an org using gitea api
     * @example cy.deleteallapps(ttd, token)
     */
    deleteallapps(orgname: string, token: string): Chainable<Element>;

    /**
     * Custom command to make an user owner of an org using gitea api
     * @example cy.makeuserowner(ttd, testuser, token)
     */
    makeuserowner(orgname: string, username: string, token: string): Chainable<Element>;

    /**
     * Custom command to delete an user using gitea api
     * @example cy.deleteuser(testuser, token)
     */
    deleteuser(username: string, token: string): Chainable<Element>;

    /**
     * Custom command to login to studio with username and pwd
     * @example cy.studiologin(testuser, userpwd)
     */
    studiologin(username: string, userpwd: string): Chainable<Element>;

    /**
     * Custom command to create an app from studio dashboard
     * @example cy.createapp(ttd, testapp)
     */
    createapp(orgname: string, appname: string): Chainable<Element>;

    /**
     * Select and delete all the added ui components in an app's ui editor
     * @example cy.deletecomponents()
     */
    deletecomponents(): Chainable<Element>;

    /**
     * Test for WCAG violations of impact critical, serious, moderate
     * @example cy.testWcag()
     */
    testWcag(): Chainable<Element>;

    /**
     * Reset local repo of an app
     * @example cy.deleteLocalChanges('test/test-app')
     */
    deleteLocalChanges(appId: String): Chainable<Element>;

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
     * Custom command to search and open an app
     * @example cy.searchAndOpenApp('ttd/app')
     */
    searchAndOpenApp(appId: string): Chainable<Element>;

    /**
     * Custom command to create a repo for an user
     * @example cy.createrepository(user, app, token)
     */
    createrepository(username: string, appName: string, token: string): Chainable<Element>;

    /**
     * Custom command to get a repo and return response
     * @example cy.getrepo('ttd/app', token)
     */
    getrepo(appId: string, token: string): Chainable<Element>;

  }
}
