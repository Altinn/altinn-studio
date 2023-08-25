/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from "@altinn-studio/language/src/nb.json";

context("Resourceadm", () => {
  before(() => {
    cy.studiologin(Cypress.env("autoTestUser"), Cypress.env("autoTestUserPwd"));
    // the login session will last throughout the tests
  });

  beforeEach(() => {
    cy.visit("/resourceadm/ttd/ttd-resources/"); // each test starts the same place
  });

  it("is possible to visit Resourceadm main page", () => {
    cy.url().should("include", "/ttd/ttd-resources"); // URL assertion of main page
  });

  // The next 3 tests navigates through resourceadm error handling: work in progress
  it("is possible to switch to all, and go to Dashboard via Error page", () => {
    cy.switchSelectedContext("all"); // triggers Error page as Resourceadm requires
    // both a valid, single organization and a complimentary org-resources repo, as in
    // /ttd/ttd-resources/
    cy.url().should("include", "/resourceadm/all");
    cy.findByRole("link", {
      name: texts["resource.back_to_dashboard"],
    }).click();
    cy.url().should("include", "/dashboard");
  });

  it("is possible to switch to self, and go to Dashboard via Error page", () => {
    cy.switchSelectedContext("self"); // triggers Error page as Resourceadm requires
    // both a valid, single organization and a complimentary org-resources repo, as in
    // /ttd/ttd-resources/
    cy.findByRole("link", {
      name: texts["resource.back_to_dashboard"],
    }).click();
    cy.url().should("include", "/dashboard");
  });

  it("is possible to switch to all, and return via Redirect page", () => {
    cy.switchSelectedContext("all"); // sets up for redirect test
    cy.url().should("include", "/resourceadm/all");
    cy.visit("/resourceadm/ttd/"); // tests Router redirect in case of correct org,
    // but missing /org-resources/ segment in URL
    cy.url().should("include", "/ttd/ttd-resources");
  });
});
