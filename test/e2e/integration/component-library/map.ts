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

    cy.get('#form-content-MapPage-MapComponent-Geometries').findByRole('link', { name: 'Delete layers' }).click();
    cy.get('g>path').click('center');
    cy.findByRole('link', { name: 'Save' }).click();
    cy.get('g>path').should('not.exist');
  });

  it('Is able to edit a geometry after deleting another one', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Kart');

    cy.intercept('GET', '**/**.png').as('tileRequest');

    const map = '#form-content-MapPage-MapComponent-Geometries';
    const drawPolygon = (points: [number, number][]) => {
      cy.findByRole('link', { name: 'Draw a polygon' }).click();
      points.forEach(([x, y], index) => {
        if (index > 0) {
          // wait for zoom to adjust (double clicking causes a zoom)
          // eslint-disable-next-line cypress/no-unnecessary-waiting
          cy.wait(200);
        }
        cy.get(map).click(x, y);
      });
      // complete polygon by clicking last point twice (without waiting, so it counts as a double click)
      const [lastX, lastY] = points[points.length - 1];
      cy.get(map).click(lastX, lastY);
      cy.get(`${map} .leaflet-editing-icon`).should('not.exist');
      // wait for map to zoom to fit the new geometry
      // eslint-disable-next-line cypress/no-unnecessary-waiting
      cy.wait(1000);
    };

    // The map zooms to fit the first polygon in the center, so the second one is drawn to the left
    drawPolygon([
      [300, 300],
      [400, 200],
      [400, 400],
    ]);
    cy.get(`${map} g>path`).should('have.length', 1);
    drawPolygon([
      [40, 300],
      [140, 200],
      [140, 400],
    ]);
    cy.get(`${map} g>path`).should('have.length', 2);

    cy.get(map).findByRole('link', { name: 'Delete layers' }).click();
    cy.get(`${map} g>path`).first().click('center');
    cy.findByRole('link', { name: 'Save' }).click();
    cy.get(`${map} g>path`).should('have.length', 1);

    // leaflet-draw uses a deprecated Leaflet API in edit mode
    cy.ignoreConsoleMessages([/Deprecated use of _flat/]);
    cy.get(`${map} g>path`)
      .invoke('attr', 'd')
      .then((pathBefore) => {
        cy.get(map).findByRole('link', { name: 'Edit layers' }).click();
        cy.get(`${map} .leaflet-editing-icon`)
          .first()
          .then(($corner) => {
            const { left, top, width, height } = $corner[0].getBoundingClientRect();
            const x = left + width / 2;
            const y = top + height / 2;
            cy.wrap($corner).trigger('mousedown', {
              button: 0,
              clientX: x,
              clientY: y,
              eventConstructor: 'MouseEvent',
            });
            // move on the map, so the leaflet-draw tooltip follows the mouse and does not cover the Save button
            cy.get(map).trigger('mousemove', { clientX: x + 25, clientY: y + 25, eventConstructor: 'MouseEvent' });
            cy.get(map).trigger('mousemove', { clientX: x + 50, clientY: y + 50, eventConstructor: 'MouseEvent' });
            cy.get(map).trigger('mouseup', { clientX: x + 50, clientY: y + 50, eventConstructor: 'MouseEvent' });
          });
        cy.findByRole('link', { name: 'Save' }).click();

        cy.get(`${map} g>path`).should('have.length', 1).and('not.have.attr', 'd', pathBefore);
      });

    cy.findByText(/Invalid geometry item/).should('not.exist');
  });

  it('should pass accessibility tests', () => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Kart');

    // Wait for the map to be rendered before running the axe check
    cy.get('.leaflet-container').should('be.visible');
    cy.testWcag();
  });
});
