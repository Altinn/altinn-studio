/// <reference types="cypress" />
/// <reference types="../../support" />

import { login } from '../../selectors/login';
import { dashboard } from '../../selectors/dashboard';
import { header } from '../../selectors/header';
import {gitea} from "../../selectors/gitea";

context('Login', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  it('is possible to login with valid user credentials and logout', () => {
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
    dashboard.getSearchReposField().should('be.visible');
    header.getAvatar().should('be.visible').click();
    header.getMenuItemLogout().should('be.visible').click();
    login.getLoginButton().should('be.visible');
    login.getCreateUserLink().should('be.visible');
  });

  it('is not possible to login with invalid user credentials', () => {
    cy.studiologin(Cypress.env('autoTestUser'), 'test123');
    gitea.getLoginErrorMessage().should('be.visible');
  });
});
