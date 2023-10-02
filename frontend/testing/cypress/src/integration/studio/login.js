/// <reference types="cypress" />
/// <reference types="../../support" />

import { login } from '../../selectors/login';
import { dashboard } from '../../selectors/dashboard';
import { header } from '../../selectors/header';
import {gitea} from "../../selectors/gitea";

context('Login', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.visit('/');
  });

  it('is possible to login with valid user credentials and logout', () => {
    cy.studioLogin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    dashboard.getSearchReposField().should('be.visible');
    header.getAvatar().should('be.visible').click();
    header.getMenuItemLogout().should('be.visible').click();
    login.getLoginButton().should('be.visible');
    login.getCreateUserLink().should('be.visible');
  });

  it('is not possible to login with invalid user credentials', () => {
    login.getLoginButton().should('be.visible').click();
    gitea.getLanguageMenu().should('be.visible').click();
    gitea.getLanguageMenuItem('Norsk').should('be.visible').click();
    gitea.getUsernameField().should('be.visible').type(Cypress.env('autoTestUser'));
    gitea.getPasswordField().should('be.visible').type('123', { log: false });
    gitea.getLoginButton().should('be.visible').click();
    gitea.getLoginErrorMessage().should('be.visible');
  });
});
