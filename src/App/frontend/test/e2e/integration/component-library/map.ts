import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

const selectors = {
  map: '#form-content-MapPage-MapComponent-Geometries',
  zoomAnimation: '.leaflet-zoom-anim',
  path: 'g > path.leaflet-interactive',
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
    moveAndClick(400, 200);
    assertPath(1, false);

    cy.findByText('Click to continue drawing shape.').should('exist');
    moveAndClick(400, 400);
    assertPath(2, false);

    cy.findByText('Click first point to close this shape.').should('exist');
    moveAndClick(300, 300);
    assertPath(3, true);

    cy.get('g>path').should('to.be.visible');

    cy.get(selectors.map).findByRole('link', { name: 'Delete layers' }).click();
    cy.get('g>path').click('center');
    cy.findByRole('link', { name: 'Save' }).click();
    cy.get('g>path').should('not.exist');
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
      const commands = path?.match(/[MLZ]/gi) ?? [];
      const drawnLines = commands.filter((command) => command.toUpperCase() === 'L').length;
      const isClosed = commands.at(-1)?.toUpperCase() === 'Z';

      expect(commands.at(0)?.toUpperCase()).to.equal('M');
      expect(drawnLines + Number(isClosed)).to.equal(lines);
      expect(isClosed).to.equal(closed);
    });
}
