/// <reference types="cypress" />

import * as designer from "../../pageobjects/designer";
import * as dashboard from "../../pageobjects/dashboard";

context.skip("Designer", () => {
  before(() => {
    cy.visit("/");    
    cy.studiologin(Cypress.env("userName"), Cypress.env("userPwd"));
    cy.createapp(Cypress.env("appOwner"), "designer");
    cy.get(header.profileButton).click();
    cy.contains(header.menuItem, "Logout").click();
  });
  beforeEach(() => {
    cy.visit("/");    
    cy.studiologin(Cypress.env("userName"), Cypress.env("userPwd"));
    cy.get(dashboard.searchApp).type("designer");
    cy.contains(common.gridItem, "designer").click();
  });

  it("About App", () => {
    
  });

});
