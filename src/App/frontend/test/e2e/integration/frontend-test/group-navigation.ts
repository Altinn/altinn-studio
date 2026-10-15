import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('Repeating group navigation', () => {
  it('links to static fields before and after a nested table in the matching outer row', () => {
    cy.interceptLayout('Task_3', undefined, (layouts) => {
      const components = layouts.repeating!.data.layout;
      const input = components.find((component) => component.id === 'currentValue');
      const nested = components.find((component) => component.id === 'subGroup');
      if (input?.type !== 'Input' || nested?.type !== 'RepeatingGroup') {
        throw new Error('Missing repeating group fixture components');
      }
      nested.hidden = false;
      for (const position of ['rowsBefore', 'rowsAfter'] as const) {
        const id = `nested-${position}`;
        components.push({ ...input, id, required: false, readOnly: false });
        nested[position] = [{ cells: [{ component: id }] }];
      }
      layouts.repeating2!.data.layout = layouts.repeating2!.data.layout.map((component) =>
        component.id === 'currentValue2'
          ? {
              id: component.id,
              type: 'Paragraph',
              textResourceBindings: {
                title: [
                  'concat',
                  ['linkToComponent', 'Før tabellen', 'nested-rowsBefore'],
                  ' ',
                  ['linkToComponent', 'Etter tabellen', 'nested-rowsAfter'],
                ],
              },
            }
          : component,
      );
    });
    cy.goto('group');
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.liten }).check();
    cy.findByRole('checkbox', { name: appFrontend.group.prefill.middels }).check();
    cy.findByRole('button', { name: /Neste/ }).click();
    cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
    cy.get('#useBothRepGroups').findByRole('radio', { name: 'Ja' }).check();

    for (const [position, label] of [
      ['rowsBefore', 'Før tabellen'],
      ['rowsAfter', 'Etter tabellen'],
    ]) {
      cy.gotoNavPage('repeating (store endringer)');
      cy.get('[data-componentid="currentValue2-1"]').findByRole('link', { name: label }).click();
      cy.get(`#nested-${position}-1`).should('be.focused').and('have.value', 'NOK 120');
      cy.get(`#nested-${position}-0`, { timeout: 0 }).should('not.exist');
    }
  });
});
