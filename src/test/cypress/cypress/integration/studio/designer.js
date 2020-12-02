/// <reference types="cypress" />

import * as designer from "../../pageobjects/designer";
import * as dashboard from "../../pageobjects/dashboard";

context.skip("Designer", () => {
  beforeEach(() => {
    cy.visit("/");
    cy.viewport(1536, 768);
  });

  it("Designer", () => {
    cy.studiologin(Cypress.env("userName"), Cypress.env("userPwd"));
    cy.createapp(Cypress.env("appOwner"), "designer");
  });

});
