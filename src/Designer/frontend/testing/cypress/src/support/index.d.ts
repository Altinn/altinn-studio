declare namespace Cypress {
  interface Chainable {
    /**
     * Custom command to create an org using gitea api
     * @example cy.createOrg(ttd, token)
     */
    createOrg(orgName: string, token: string): Chainable<Element>;

    /**
     * Custom command to delete an org using gitea api
     * @example cy.deleteOrg(ttd, token)
     */
    deleteOrg(orgName: string, token: string): Chainable<Element>;

    /**
     * Custom command to delete all apps of an org using gitea api
     * @example cy.deleteAllApps(ttd, token)
     */
    deleteAllApps(orgName: string, token: string): Chainable<Element>;

    /** Custom command to deleta a given app using the Gitea API */
    deleteApp(orgName: string, appName: string, token: string): Chainable<Element>;

    /**
     * Custom command to make an user owner of an org using gitea api
     * @example cy.makeUserOwner(ttd, testUser, token)
     */
    makeUserOwner(orgName: string, userName: string, token: string): Chainable<Element>;

    /**
     * Custom command to delete an user using gitea api
     * @example cy.deleteUser(testUser, token)
     */
    deleteUser(userName: string, token: string): Chainable<Element>;

    /**
     * Custom command to login to studio with username and pwd
     * @example cy.studioLogin(testUser, userPwd)
     */
    studioLogin(userName: string, userPwd: string): Chainable<Element>;

    /**
     * Custom command to create an app from studio dashboard
     * @example cy.createApp(Testdepartementet, testApp)
     */
    createApp(orgName: string, appName: string): Chainable<Element>;

    /**
     * Select and delete all the added ui components in an app's ui editor
     * @example cy.deleteComponents()
     */
    deleteComponents(): Chainable<Element>;

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
     * Get body of iframe from the DOM
     * @example cy.getIframeBody()
     */
    getIframeBody(): Chainable<Element>;

    /**
     * check visibility of an element whose parent is found hidden by cypress
     */
    isVisible(): Chainable<Element>;

    /**
     * Custom command to search and open an app based on only app name
     * @example cy.searchAndOpenApp('appName')
     */
    searchAndOpenApp(appName: string): Chainable<Element>;

    /**
     * Custom command to go directly to an app using url
     */
    goToApp(userName: string, appName: string): Chainable<Element>;

    /**
     * Switch selected context in dashboard
     * @param context The context to switch to. Either 'self', 'all', or org user name.
     * @example cy.searchAndOpenApp('self')
     */
    switchSelectedContext(context: string): Chainable<Element>;

    /**
     * Custom command to create a repo for an user
     * @example cy.createRepository(user, app, token)
     */
    createRepository(username: string, appName: string, token: string): Chainable<Element>;

    /**
     * Custom command to get a repo and return response
     * @example cy.getRepoByAppId('ttd/app', token)
     */
    getRepoByAppId(appId: string, token: string): Chainable<Element>;
  }
}
