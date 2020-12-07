/// <reference types="cypress" />
import * as loginPage from "../pageobjects/loginandreg";
import * as dashboard from "../pageobjects/dashboard";

/**
 * Login to studio with user name and password
 */
Cypress.Commands.add("studiologin", (userName, userPwd) => {
  cy.get(loginPage.loginButton).click();
  cy.get(loginPage.userName).type(userName);
  cy.get(loginPage.userPwd).type(userPwd);
  cy.get(loginPage.submit).click();
});

/**
 * create an app in studio with user logged in and in dashboard
 */
Cypress.Commands.add("createapp", (orgName, appName) => {
  cy.get(dashboard.newApp).click();
  cy.get(dashboard.appOwners).click();
  cy.contains(dashboard.appOwnersList, orgName).click();
  cy.get(dashboard.appName).type(appName);  
  cy.intercept("POST", "**/designerapi/Repository/CreateApp**").as("postCreateApp");
  cy.get(dashboard.button).contains(dashboard.createApp).click();
  cy.wait("@postCreateApp", { timeout: 20000 }).its('response.statusCode').should('eq', 200);
});
