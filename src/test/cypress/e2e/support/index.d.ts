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
    makeuserowner(
      orgname: string,
      username: string,
      token: string
    ): Chainable<Element>;

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
  }
}
