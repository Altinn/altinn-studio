import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const simple = () => cy.get('test-binding-component#custom-simple');
const named = () => cy.get('test-binding-component#custom-named:not([summarymode])');
const legacySummary = () => cy.get('[data-testid=summary-custom-legacy-summary]');
const summary = () => cy.get('[data-componentbaseid=custom-summary2] test-binding-component');

describe('Custom web components', () => {
  beforeEach(() => {
    cy.gotoHiddenPage('custom-components');
  });

  it('synchronizes simple and arbitrary bindings, persists them and renders live summaries', () => {
    cy.get('#custom-mirror-simple').type('From model');
    simple().shadow().find('[data-field=simpleBinding]').should('have.value', 'From model');
    simple().shadow().find('input').clear().type('From web component');
    cy.get('#custom-mirror-simple').should('have.value', 'From web component');

    cy.get('#custom-mirror-named').type('First model value');
    cy.get('#custom-mirror-secondary').type('Second model value');
    named().shadow().find('[data-field=quokkaValue]').should('have.value', 'First model value');
    named().shadow().find('[data-field=nebulaValue]').should('have.value', 'Second model value');
    named().shadow().find('[data-field=quokkaValue]').clear().type('Quokka');
    named().shadow().find('[data-field=nebulaValue]').clear().type('Nebula');
    cy.get('#custom-mirror-named').should('have.value', 'Quokka');
    cy.get('#custom-mirror-secondary').should('have.value', 'Nebula');
    cy.get('#custom-mirror-simple').should('have.value', 'From web component');
    cy.waitUntilSaved();
    cy.reloadAndWait();
    simple().shadow().find('input').should('have.value', 'From web component');
    named().shadow().find('[data-field=quokkaValue]').should('have.value', 'Quokka');
    named().shadow().find('[data-field=nebulaValue]').should('have.value', 'Nebula');

    legacySummary().should('contain.text', 'Quokka, Nebula');
    legacySummary().find('test-binding-component').should('not.exist');
    named().shadow().find('[data-summary]').should('not.exist');
    summary().should('have.attr', 'summarymode');
    summary().shadow().find('[data-summary]').should('be.visible');
    summary().shadow().find('[data-summary-heading]').should('have.text', 'Custom summary');
    summary().shadow().find('[data-title]').should('have.text', 'Egendefinert felt');
    summary().shadow().find('[data-caption]').should('have.text', 'Ekstra ledetekst');
    summary().shadow().find('dl > div').should('have.length', 2);
    summary().shadow().find('dt').should('have.text', 'quokkaValuenebulaValue');
    summary().shadow().find('input').should('not.exist');
    summary().shadow().find('[data-field=quokkaValue]').should('have.text', 'Quokka');
    summary().shadow().find('[data-field=nebulaValue]').should('have.text', 'Nebula');
    cy.get('#custom-mirror-secondary').clear();
    cy.get('#custom-mirror-secondary').type('Updated');
    legacySummary().should('contain.text', 'Quokka, Updated').and('not.contain.text', 'Nebula');
    summary().shadow().find('[data-field=quokkaValue]').should('have.text', 'Quokka');
    summary().shadow().find('[data-field=nebulaValue]').should('have.text', 'Updated');
    cy.visualTesting('custom-components');
  });

  it('passes configuration and reactive translated texts and reconnects after hiding', () => {
    const metadata = { answer: 42, enabled: true, choices: ['red', 'blue'], empty: null };
    simple().should('have.attr', 'fixturemetadata', JSON.stringify(metadata));
    simple().should('have.attr', 'fixturecount', '42');
    simple().should('have.attr', 'fixtureenabled', '');
    simple().should('have.attr', 'fixturechoices', JSON.stringify(['red', 'blue']));
    simple().should('have.attr', 'fixtureempty', 'null');
    simple().shadow().find('[data-caption]').should('have.text', 'Ekstra ledetekst');
    summary().shadow().find('[data-caption]').should('have.text', 'Ekstra ledetekst');
    simple().shadow().find('input').should('have.prop', 'required', true);
    cy.findByRole('radio', { name: 'Skrivebeskyttet' }).check();
    simple().shadow().find('input').should('have.prop', 'readOnly', true);
    simple().shadow().find('[data-caption]').should('have.text', 'Skrivebeskyttet ledetekst');
    summary().shadow().find('[data-caption]').should('have.text', 'Skrivebeskyttet ledetekst');
    cy.findByRole('radio', { name: 'Redigerbar' }).check();
    simple().shadow().find('[data-caption]').should('have.text', 'Ekstra ledetekst');
    summary().shadow().find('[data-caption]').should('have.text', 'Ekstra ledetekst');

    cy.findByRole('radio', { name: 'Skjult' }).check();
    simple().should('not.exist');
    named().should('not.exist');
    cy.get('#custom-mirror-simple').type('While hidden');
    cy.findByRole('radio', { name: 'Redigerbar' }).check();
    simple().shadow().find('input').should('have.value', 'While hidden').and('have.prop', 'readOnly', false);
    simple().shadow().find('input').clear().type('Reconnected');
    cy.get('#custom-mirror-simple').should('have.value', 'Reconnected');
    named().shadow().find('[data-field=quokkaValue]').type('Reconnected named');
    cy.get('#custom-mirror-named').should('have.value', 'Reconnected named');

    simple().shadow().find('[data-title]').should('have.text', 'Egendefinert felt');
    simple().shadow().find('[data-caption]').should('have.text', 'Ekstra ledetekst');
    simple().should('have.attr', 'grid', JSON.stringify({ xs: 12 }));
    simple().should('have.prop', 'texts').and('deep.equal', {
      title: 'Egendefinert felt',
      shortName: 'Ekstra ledetekst',
      galaxyCaption: 'Ekstra ledetekst',
    });
    cy.get(appFrontend.languageSelector).click();
    cy.findByRole('menuitemradio', { name: 'Engelsk' }).click();
    simple().shadow().find('[data-title]').should('have.text', 'Custom field');
    simple().shadow().find('[data-caption]').should('have.text', 'Extra caption');
    summary().shadow().find('[data-title]').should('have.text', 'Custom field');
    summary().shadow().find('[data-caption]').should('have.text', 'Extra caption');
  });
});
