/// <reference types="cypress" />

import * as designer from "../../pageobjects/designer";
import Common from "../../pageobjects/common";
import * as header from "../../pageobjects/header";
import * as dashboard from "../../pageobjects/dashboard";
import { builds } from "../../fixtures/builds";
import { deploys } from "../../fixtures/deploys";

const common = new Common();

context("Deploy", () => {
  before(() => {
    cy.visit("/");
    cy.studiologin(Cypress.env("userName"), Cypress.env("userPwd"));
    cy.createapp(Cypress.env("appOwner"), "deploy");
    cy.get(header.profileButton).click();
    cy.contains(header.menuItem, "Logout").click();
  });
  beforeEach(() => {
    cy.visit("/");
    cy.studiologin(Cypress.env("userName"), Cypress.env("userPwd"));
    cy.get(dashboard.searchApp).type("deploy");
    cy.contains(common.gridItem, "deploy").click();
    cy.get(designer.appMenu["deploy"]).click();
  });

  it("Inprogress build", () => {
    cy.intercept("GET", "**/designer/api/v1/ttd/deploy/releases**", builds("inprogress")).as("buildstatus");
    cy.wait("@buildstatus").its('response.statusCode').should('eq', 200);
    cy.contains(common.gridItem, designer.olderBuilds).next(common.gridContainer).then(($builds) => {
      cy.get($builds).children().first().find(designer.inprogressSpinner).should('be.visible');
    });
  });

  it("Failed build", () => {
    cy.intercept("GET", "**/designer/api/v1/ttd/deploy/releases**", builds("failed")).as("buildstatus");
    cy.wait("@buildstatus").its('response.statusCode').should('eq', 200);
    cy.contains(common.gridItem, designer.olderBuilds).next(common.gridContainer).then(($builds) => {
      cy.get($builds).children().first().find(designer.failedCheck).should('be.visible');
    });
  });

  it("Successful build", () => {
    cy.intercept("GET", "**/designer/api/v1/ttd/deploy/releases**", builds("succeeded")).as("buildstatus");
    cy.wait("@buildstatus").its('response.statusCode').should('eq', 200);
    cy.contains(common.gridItem, designer.olderBuilds).next(common.gridContainer).then(($builds) => {
      cy.get($builds).children().first().find(designer.successCheck).should('be.visible');
    });
  });

  it("App Deploy", () => {
    cy.intercept("GET", "**/designer/api/v1/*/*/Deployments**", deploys()).as("deploys");
    cy.wait("@deploys").its('response.statusCode').should('eq', 200);
    cy.contains("div", "AT22").should('be.visible');
    cy.get(designer.at22Deploys).find('tbody > tr').should('contain.text', "testuser");
  });

});
