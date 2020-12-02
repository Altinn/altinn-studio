/// <reference types="cypress" />

import * as loginPage from "../../pageobjects/loginandreg";

context("Login", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.viewport(1536, 768);
  });

  it("Login with valid user credentials", () => {
    cy.studiologin(Cypress.env("userName"), Cypress.env("userPwd"));
  });

  it("Login with invalid user credentials", () => {
    cy.studiologin(Cypress.env("userName"), "test123");
    cy.get(loginPage.errorMessage).should("be.visible");
  });
});
