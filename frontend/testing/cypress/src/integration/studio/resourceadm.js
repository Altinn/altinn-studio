/// <reference types="cypress" />
/// <reference types="../../support" />

import * as texts from '@altinn-studio/language/src/nb.json';

// Cypress tests of sub-repo Resourceadm: this is a work in progress

context('Resourceadm', () => {
  before(() => {
    cy.studiologin(Cypress.env('autoTestUser'), Cypress.env('autoTestUserPwd'));
  });

  beforeEach(() => {
    cy.visit('/resourceadm/ttd/ttd-resources/');
  });

  it('is possible to visit Resourceadm main page', () => {
    cy.url().should('include', '/ttd/ttd-resources');
  });

  it('is possible to switch to all, and go to Dashboard via Error page', () => {
    cy.switchSelectedContext('all');
    cy.url().should('include', '/resourceadm/all');
    cy.findByRole('link', {
      name: texts['resourceadm.error_back_to_dashboard'],
    }).click();
    cy.url().should('include', '/dashboard');
  });

  it('is possible to switch to self, and go to Dashboard via Error page', () => {
    cy.switchSelectedContext('self');
    cy.findByRole('link', {
      name: texts['resourceadm.error_back_to_dashboard'],
    }).click();
    cy.url().should('include', '/dashboard');
  });

  it('is possible to switch to all, and return via Redirect page', () => {
    cy.switchSelectedContext('all');
    cy.url().should('include', '/resourceadm/all');
    cy.visit('/resourceadm/ttd/');
    cy.url().should('include', '/ttd/ttd-resources');
  });

  it('is possible to create a new Resource', () => {
    cy.findByRole('button', {
      name: texts['resourceadm.dashboard_create_resource'],
    }).click();
    cy.findByRole('heading', {
      name: texts['resourceadm.dashboard_create_resource'],
    });
    cy.findByRole('textbox', {
      name: texts['resourceadm.dashboard_resource_name_and_id_resource_name'],
    }).type('cy-ny-ressurs1');
    cy.findByRole('button', {
      name: texts['resourceadm.dashboard_create_modal_create_button'],
    }).click();
    cy.url().should('include', '/about');
    cy.findByRole('heading', {
      name: texts['resourceadm.about_resource_title'],
    });
  });

  it('is possible to visit Resource page via table edit button', () => {
    cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_missing_policy']);
    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click();
    cy.url().should('include', '/about');
  });

  it('is possible to return from Resource page via left nav button', () => {
    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click();
    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_back'],
    }).click();
    cy.url().should('include', '/ttd/ttd-resources');
  });

  it('is possible to switch order of resources and check policy status', () => {
    cy.findByRole('button', {
      name: texts['resourceadm.dashboard_table_header_last_changed'],
    }).click();
    cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_missing_policy']);
  });

  it('is possible to visit Resource page and add a policy', () => {
    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click();
    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_policy'],
    }).click();
    cy.findByRole('heading', {
      name: texts['resourceadm.resource_navigation_modal_title_resource'],
    });
    cy.findByRole('button', {
      name: texts['resourceadm.resource_navigation_modal_button_move_on'],
    }).click();
    cy.url().should('include', '/policy');
    cy.findByRole('heading', {
      name: texts['resourceadm.policy_editor_title'],
    });
    cy.findByRole('button', {
      name: texts['policy_editor.card_button_text'],
    }).click();
    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_back'],
    }).click();
    cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_has_policy']);
    cy.url().should('include', '/ttd/ttd-resources');
  });

  it('is possible to visit Policy page and return to Resource page', () => {
    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click();
    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_policy'],
    }).click();
    cy.findByRole('heading', {
      name: texts['resourceadm.resource_navigation_modal_title_resource'],
    });
    cy.findByRole('button', {
      name: texts['resourceadm.resource_navigation_modal_button_move_on'],
    }).click();
    cy.url().should('include', '/policy');
    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_about'],
    }).click();
    cy.findByRole('heading', {
      name: texts['resourceadm.resource_navigation_modal_title_policy'],
    });
    cy.findByRole('button', {
      name: texts['resourceadm.resource_navigation_modal_button_move_on'],
    }).click();
    cy.url().should('include', '/about');
  });

  it('is possible to visit Deploy page and return to Resource page', () => {
    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click();
    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_deploy'],
    }).click();
    cy.findByRole('heading', {
      name: texts['resourceadm.resource_navigation_modal_title_resource'],
    });
    cy.findByRole('button', {
      name: texts['resourceadm.resource_navigation_modal_button_move_on'],
    }).click();
    cy.url().should('include', '/deploy');
    cy.findByRole('heading', {
      name: texts['resourceadm.deploy_title'],
    });

    // Fix-me: cy.findByRole('button') will not work while Error-module is visible
    cy.get('button').contains(texts['resourceadm.left_nav_bar_about']).click();
    cy.url().should('include', '/about');
  });
});
