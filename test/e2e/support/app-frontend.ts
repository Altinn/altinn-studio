import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { ILayouts } from 'src/layout/layout';

const appFrontend = new AppFrontend();

Cypress.Commands.add('reloadAndWait', () => {
  cy.reload();
  cy.get('#readyForPrint').should('exist');
});

Cypress.Commands.add(
  'addItemToGroup',
  (oldValue: number, newValue: number, comment: string, openByDefault?: boolean) => {
    if (!openByDefault) {
      cy.get(appFrontend.group.addNewItem).click();
    }

    cy.get(appFrontend.group.currentValue).type(`${oldValue}`);
    cy.get(appFrontend.group.currentValue).blur();
    cy.get(appFrontend.group.newValue).type(`${newValue}`);
    cy.get(appFrontend.group.newValue).blur();
    cy.get(appFrontend.group.mainGroup)
      .find(appFrontend.group.editContainer)
      .find(appFrontend.group.next)

      .click();

    if (openByDefault || typeof openByDefault === 'undefined') {
      cy.get(appFrontend.group.addNewItemSubGroup).should('not.exist');
    } else {
      cy.get(appFrontend.group.addNewItemSubGroup).click();
    }

    cy.get(appFrontend.group.comments).type(comment);
    cy.get(appFrontend.group.comments).blur();
    cy.get(appFrontend.group.saveSubGroup).clickAndGone();
    cy.get(appFrontend.group.saveMainGroup).clickAndGone();
  },
);

Cypress.Commands.add('startStateFullFromStateless', () => {
  cy.intercept('POST', '**/instances/create').as('createInstance');
  cy.intercept('**/api/layoutsettings/statefull').as('getLayoutSettings');
  cy.get(appFrontend.instantiationButton).click();
  cy.wait('@createInstance').its('response.statusCode').should('eq', 201);
  cy.wait('@getLayoutSettings');
});

Cypress.Commands.add('getReduxState', (selector) =>
  cy
    .window()
    .its('reduxStore')
    .invoke('getState')
    .then((state) => {
      if (selector) {
        return selector(state);
      }

      return state;
    }),
);

Cypress.Commands.add('reduxDispatch', (action) => cy.window().its('reduxStore').invoke('dispatch', action));

Cypress.Commands.add('interceptLayout', (taskName, mutator, wholeLayoutMutator) => {
  cy.intercept({ method: 'GET', url: `**/api/layouts/${taskName}`, times: 1 }, (req) => {
    req.reply((res) => {
      const set = JSON.parse(res.body);
      if (mutator) {
        for (const layout of Object.values(set)) {
          (layout as any).data.layout.map(mutator);
        }
      }
      if (wholeLayoutMutator) {
        wholeLayoutMutator(set);
      }
      res.send(JSON.stringify(set));
    });
  }).as(`interceptLayout(${taskName})`);
});

Cypress.Commands.add('changeLayout', (mutator, wholeLayoutMutator) => {
  cy.window().then((win) => {
    const state = win.reduxStore.getState();
    const layouts: ILayouts = structuredClone(state.formLayout.layouts || {});
    if (mutator && layouts) {
      for (const layout of Object.values(layouts)) {
        for (const component of layout || []) {
          mutator(component);
        }
      }
    }
    if (wholeLayoutMutator) {
      wholeLayoutMutator(layouts);
    }
    win.reduxStore.dispatch({
      type: 'formLayout/updateLayouts',
      payload: layouts,
    });
  });
});
