/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from "../../../../../language/src/nb.json";
import { administration } from "../../selectors/administration";
import { designer } from "../../selectors/designer";
import { header } from "../../selectors/header";

context("Designer", () => {
  before(() => {
    cy.visit("/");
    cy.studiologin(Cypress.env("autoTestUser"), Cypress.env("autoTestUserPwd"));
    cy.deleteallapps(Cypress.env("autoTestUser"), Cypress.env("accessToken"));
    cy.createapp(Cypress.env("autoTestUser"), "designer");
    cy.createapp(Cypress.env("autoTestUser"), "appwithout-dm");
    cy.clearCookies();
    cy.studiologin(Cypress.env("autoTestUser"), Cypress.env("autoTestUserPwd"));
  });
  beforeEach(() => {
    cy.visit("/dashboard");
  });

  it("is possible to edit information about the app", () => {
    const designerApp = Cypress.env("designerApp");
    cy.searchAndOpenApp(designerApp);
    administration.getHeader().should("be.visible");
    cy.findByRole("button", { name: texts["general.edit"] }).click();
    administration.getAppNameField().clear().type("New app name");
    administration.getDescriptionField().clear().type("App description");
    administration
      .getAppNameField()
      .invoke("val")
      .should("contain", "New app name");
    administration
      .getDescriptionField()
      .invoke("val")
      .should("contain", "App description");
  });

  it("is possible to add and delete form components", () => {
    cy.searchAndOpenApp(Cypress.env("designerApp"));
    header.getCreateLink().click();
    designer.getAddPageButton().click();
    designer.getAddPageButton().click();
    cy.findByText(texts["ux_editor.component_navigation_buttons"]).should(
      "be.visible"
    );
    designer
      .getToolbarItemByText(texts["ux_editor.component_input"])
      .trigger("dragstart");
    designer.getDroppableList().trigger("drop");
    cy.wait(500);
    designer
      .getDroppableList()
      .findAllByRole("listitem")
      .then(($elements) => expect($elements.length).eq(2));
    cy.deletecomponents();
  });

  // Disabled for now, as this generates too many copies of the same app
  // it('is possible to delete local changes of an app ', () => {
  //   cy.searchAndOpenApp(Cypress.env('designerApp'));
  //   cy.intercept('GET', '**/layout-settings').as('getLayoutSettings');
  //   cy.get(designer.appMenu['edit']).click();
  //   cy.wait('@getLayoutSettings');
  //   cy.get("button[aria-label='Legg til ny side']").click();
  //   cy.get(designer.formComponents.longAnswer).parents(designer.draggable).trigger('dragstart');
  //   cy.get(designer.dragToArea).trigger('drop');
  //   cy.deleteLocalChanges(Cypress.env('designerApp'));
  // });
});
