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

    cy.get('#resourceNameInputId').type('cy-ny-ressurs1');

    cy.findByRole('button', {
      name: texts['resourceadm.dashboard_create_modal_create_button'],
    }).click();

    cy.url().should('include', '/about');

    cy.findByRole('heading', {
      name: texts['resourceadm.about_resource_title'],
    });
  });

  it('is possible to visit Resource page via table edit button', () => {
    // cy.switchSelectedContext('oneSingleRepoOrg'); // IN DEV: has SINGLE resource (unfortunately, also policy now)
    // cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_edit']).click();

    // At this point, after creating a resource in ttd,
    // the resource should not have a policy
    // cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_has_policy']); // IN DEV
    // not necessary now that Docker Desktop kan delete resources in Volumes GUI

    cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_missing_policy']);

    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click(); // findByRole("button") will fail if there are multiple identical buttons present

    cy.url().should('include', '/about');
  });

  it('is possible to return from Resource page via left nav button', () => {
    // cy.switchSelectedContext('oneSingleRepoOrg'); // has SINGLE resource (unfortunately, also policy now)

    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click(); // findByRole("button") will fail if there are multiple identical buttons present

    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_back'],
    }).click();

    cy.url().should('include', '/ttd/ttd-resources');
  });

  it('is possible to switch order of resources and check policy status', () => {
    // We should by this point have a single resource, without policy:
    // cy.switchSelectedContext('oneSingleRepoOrg'); // IN DEV: has SINGLE resource (unfortunately, also policy now)

    cy.findByRole('button', {
      name: texts['resourceadm.dashboard_table_header_last_changed'],
    }).click();

    cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_missing_policy']);
    // cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_has_policy']); // IN DEV
  });

  it('is possible to visit Resource page and add a policy', () => {
    // cy.switchSelectedContext('oneSingleRepoOrg'); // IN DEV: has SINGLE resource (unfortunately, also policy now)

    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click(); // findByRole("button") will fail if there are multiple identical buttons in table

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

    cy.url().should('include', '/ttd/ttd-resources'); // IN PROD
  });

  it('is possible to visit Policy page and return to Resource page', () => {
    // cy.switchSelectedContext('oneSingleRepoOrg'); // IN DEV: has SINGLE resource (unfortunately, also policy now)

    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click(); // findByRole("button") will fail if there are multiple identical buttons in table

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

  /*
  it('is possible to visit Deploy page and return to Resource page', () => {
    cy.switchSelectedContext('oneSingleRepoOrg'); // IN DEV: has SINGLE resource (unfortunately, also policy now)

    // cy.findByRole('table').contains(texts['resourceadm.dashboard_table_row_edit']).click();

    cy.findByRole('table')
      .findByRole('button', {
        name: texts['resourceadm.dashboard_table_row_edit'],
      })
      .click(); // findByRole("button") will fail if there are multiple identical buttons in table

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

    // RETURN to Resource Page
    
    cy.findByRole('button', { 
      name: texts['resourceadm.left_nav_bar_about'],
    }).click(); // interessant: her på Deploy page så virker dette ikke,
    // fordi William har brukt button inni Alert-module varsel om feil på sidene
    // med identisk språk-nøkkel (linker jo til samme side...) 

    // Er vel flere måter å fikse dette på: Tomas vil ikke like data-cy tagger,
    // men jeg kan kanskje gå inn i resourceadm språknøkler og lage
    // egne språknøkler for Alert-module...
    

    cy.findByRole('button', { 
      name: texts['resourceadm.left_nav_bar_policy'],
    }).click(); // vil Policy knapp finnes? Nei, ikke den heller
    

    // OK RødBoksMedFiksFeil er en Alert-module,
    // som inni der bruker <button class="Link-module"...> griseri
    cy.findByRole('link', {
      name: texts['resourceadm.left_nav_bar_about'],
    }); //.click();

    cy.findByRole('link', {
      name: texts['resourceadm.left_nav_bar_policy'],
    }); //.click();

    // hva med Dashboard i VenstreNavMeny?
    cy.findByRole('button', {
      name: texts['resourceadm.left_nav_bar_back'],
    }).click(); // den fungerer
    // ---> da er det nok at det er lenker, med tekst
    // <a>Om ressursen</a> og <a>Tilgangsregler</>
    // som forstyrrer cy.findByRole... selv om den røde error-boksen
    // kanskje ikke er "button"

    // denne kode-blokken, selv om den finner knappen fra Policy-siden...
    cy.get('button').contains('Om ressursen').click(); // trenger ikke Modal-skip her

    cy.url().should('include', '/about');
  });
  */
});
