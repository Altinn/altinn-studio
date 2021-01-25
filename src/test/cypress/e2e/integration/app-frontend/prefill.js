/// <reference types="cypress" />

import * as af from "../../pageobjects/app-frontend";

context("Login", () => {
    before(() => {
        cy.visit(Cypress.env("localTestBaseUrl"));
        cy.get(af.appSelection).select("Endring av navn");
        cy.get(af.startButton).click();
    });

    it("Check Prefill", () => {
        cy.get(af.changeOfName.currentName)
            .should('be.visible')
            .and('have.value', 'Ola Nordmann');
    });

});