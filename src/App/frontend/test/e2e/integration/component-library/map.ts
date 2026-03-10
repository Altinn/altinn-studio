import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Map component', () => {
  it('Is able to draw new geometries on a map using the toolbar', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Kart');

    cy.intercept('GET', '**/**.png').as('tileRequest');

    // Draw a polygon
    cy.findByRole('link', { name: 'Draw a polygon' }).click();
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(300, 300);
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(400, 200);
    // wait for zoom to adjust (double clicking causes a zoom)
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(400, 400);
    // complete polygon by clicking last point twice
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(400, 400);

    cy.get('g>path').should('to.be.visible');
  });

  it('Is able to draw new geometries and delete them on a map using the toolbar', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Kart');

    cy.intercept('GET', '**/**.png').as('tileRequest');

    // Draw a polygon
    cy.findByRole('link', { name: 'Draw a polygon' }).click();
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(300, 300);
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(400, 200);
    // wait for zoom to adjust (double clicking causes a zoom)
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(400, 400);
    // complete polygon by clicking last point twice
    cy.get('#form-content-MapPage-MapComponent-Geometries').click(400, 400);
    // wait for map to adjust to new geometry
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(200);

    cy.get('g>path').should('to.be.visible');

    cy.findByRole('link', { name: 'Delete layers' }).click();
    cy.get('g>path').click('center');
    cy.findByRole('link', { name: 'Save' }).click();
    cy.get('g>path').should('not.exist');
  });
});
