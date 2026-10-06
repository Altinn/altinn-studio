import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();
const simple = () => cy.get('test-binding-component#custom-simple');
const named = () => cy.get('test-binding-component#custom-named:not([summarymode])');
const summary = () => cy.get('[data-componentbaseid=custom-summary2] test-binding-component');

describe('Custom web components', () => {
  beforeEach(() => {
    cy.gotoHiddenPage('custom-components');
  });

  it('reads and writes simpleBinding without a field in the change event, and persists the value', () => {
    cy.get('#custom-mirror-simple').type('From model');
    simple().shadow().find('[data-field=simpleBinding]').should('have.value', 'From model');
    simple().shadow().find('input').clear().type('From web component');
    cy.get('#custom-mirror-simple').should('have.value', 'From web component');
    cy.waitUntilSaved();
    cy.reloadAndWait();
    simple().shadow().find('input').should('have.value', 'From web component');
  });

  it('keeps arbitrary binding names separate and synchronizes both directions', () => {
    cy.get('#custom-mirror-named').type('First model value');
    cy.get('#custom-mirror-secondary').type('Second model value');
    named().shadow().find('[data-field=quokkaValue]').should('have.value', 'First model value');
    named().shadow().find('[data-field=nebulaValue]').should('have.value', 'Second model value');
    named().shadow().find('[data-field=quokkaValue]').clear().type('Quokka');
    named().shadow().find('[data-field=nebulaValue]').clear().type('Nebula');
    cy.get('#custom-mirror-named').should('have.value', 'Quokka');
    cy.get('#custom-mirror-secondary').should('have.value', 'Nebula');
    cy.get('#custom-mirror-simple').should('have.value', '');
    cy.waitUntilSaved();
    cy.reloadAndWait();
    named().shadow().find('[data-field=quokkaValue]').should('have.value', 'Quokka');
    named().shadow().find('[data-field=nebulaValue]').should('have.value', 'Nebula');
  });

  it('passes translated title and shortName bindings, and serializes layout configuration', () => {
    simple().shadow().find('[data-title]').should('have.text', 'Egendefinert felt');
    simple().shadow().find('[data-caption]').should('have.text', 'Ekstra ledetekst');
    simple().should('have.attr', 'grid', JSON.stringify({ xs: 12 }));
    simple().should('have.prop', 'texts').and('deep.equal', {
      title: 'Egendefinert felt',
      shortName: 'Ekstra ledetekst',
    });
    cy.get(appFrontend.languageSelector).click();
    cy.findByRole('menuitemradio', { name: 'Engelsk' }).click();
    simple().shadow().find('[data-title]').should('have.text', 'Custom field');
    simple().shadow().find('[data-caption]').should('have.text', 'Extra caption');
  });

  it('renders legacy summaries and the web component in Summary2 mode with live values', () => {
    named().shadow().find('[data-field=quokkaValue]').type('Quokka');
    named().shadow().find('[data-field=nebulaValue]').type('Nebula');
    cy.get('[data-testid=summary-custom-legacy-summary]').should('contain.text', 'Quokka, Nebula');
    summary().shadow().find('input').should('not.exist');
    summary().shadow().find('[data-field=quokkaValue]').should('have.text', 'Quokka');
    summary().shadow().find('[data-field=nebulaValue]').should('have.text', 'Nebula');
    cy.get('#custom-mirror-secondary').clear();
    cy.get('#custom-mirror-secondary').type('Updated');
    summary().shadow().find('[data-field=nebulaValue]').should('have.text', 'Updated');
  });

  it('evaluates readOnly and required and reconnects bindings after hiding and showing', () => {
    simple().shadow().find('input').should('have.prop', 'required', true);
    cy.findByRole('radio', { name: 'Skrivebeskyttet' }).check();
    simple().shadow().find('input').should('have.prop', 'readOnly', true);
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
  });
});
