import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const selectors = {
  map: '#form-content-MapPage-MapComponent-Geometries',
  zoomAnimation: '.leaflet-zoom-anim',
  path: 'g > path.leaflet-interactive',
  drawVertex: '.leaflet-marker-icon.leaflet-editing-icon',
};

describe('Map component', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.componentLibrary, { authenticationLevel: '2' });
    cy.gotoNavPage('Kart');
  });

  it('Is able to draw new geometries on a map using the toolbar and delete them after', () => {
    // Draw a polygon
    cy.findByRole('link', { name: 'Draw a polygon' }).click();
    cy.findByText('Click to start drawing shape.').should('exist');
    moveAndClick(300, 300);
    assertPath(0, false);

    cy.findByText('Click to continue drawing shape.').should('exist');
    moveAndClick(400, 300);
    assertPath(1, false);

    cy.findByText('Click to continue drawing shape.').should('exist');
    moveAndClick(400, 400);
    assertPath(2, false);

    cy.findByText('Click first point to close this shape.').should('exist');
    moveAndClick(300, 400);
    assertPath(3, false);

    cy.findByText('Click first point to close this shape.').should('exist');
    cy.get(selectors.map).trigger('mousemove', 300, 300);
    cy.findByText('Click first point to close this shape.').should('exist');
    cy.get(selectors.map).find(selectors.drawVertex).first().should('be.visible').click();
    assertPath(4, true);
    // Saving refreshes the Leaflet Draw control, so wait before entering deletion mode.
    cy.waitUntilSaved();

    cy.get('g>path').should('to.be.visible');

    cy.get(selectors.map).findByRole('link', { name: 'Delete layers' }).click();
    cy.findByRole('link', { name: 'Save' }).should('be.visible');
    cy.get(selectors.path).click('center');
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
      // Close through the first vertex so completion does not depend on double-click timing.
      cy.get(`${map} .leaflet-editing-icon`).first().click();
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

function moveAndClick(x: number, y: number) {
  cy.get(selectors.zoomAnimation).should('not.exist');
  cy.get(selectors.map).trigger('mousemove', x, y);
  cy.get(selectors.map).click(x, y);
  cy.get(selectors.zoomAnimation).should('not.exist');
}

function assertPath(lines: number, closed: boolean) {
  if (lines === 0) {
    cy.get(selectors.path).should('not.exist');
    return;
  }

  cy.get(selectors.path)
    .invoke('attr', 'd')
    .should((path) => {
      const commands: string[] = path?.match(/[MLZ]/gi) ?? [];
      const drawnLines = commands.filter((command) => command.toUpperCase() === 'L').length;
      const isClosed = commands.at(-1)?.toUpperCase() === 'Z';

      expect(commands.at(0)?.toUpperCase()).to.equal('M');
      expect(drawnLines + Number(isClosed)).to.equal(lines);
      expect(isClosed).to.equal(closed);
    });
}
