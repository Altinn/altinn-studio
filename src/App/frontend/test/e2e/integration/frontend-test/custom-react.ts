import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import type { CompExternal } from 'src/layout/layout';

const appFrontend = new AppFrontend();

// The React component is registered by wwwroot/custom-js/custom-react-components.js in the frontend-test app
const customReactComponent: CompExternal<'CustomReact'> = {
  id: 'customReactName',
  type: 'CustomReact',
  componentName: 'test-name-input',
  dataModelBindings: {
    value: {
      field: 'NyttNavn-grp-9313.NyttNavn-grp-9314.PersonMellomnavnNytt-datadef-34759.value',
      dataType: 'ServiceModel-test',
    },
  },
  textResourceBindings: {
    title: 'Mellomnavn fra React',
    hint: 'Denne komponenten er levert av appen',
    summaryPrefix: 'Oppsummert',
  },
  options: { placeholder: 'Skriv et mellomnavn' },
};

const summaryComponent: CompExternal<'Summary2'> = {
  id: 'customReactSummary',
  type: 'Summary2',
  target: { type: 'component', id: 'customReactName' },
};

function addCustomReactComponent(times = 1) {
  cy.interceptLayout(
    'Task_2',
    undefined,
    (layoutSet) => {
      layoutSet.form.data.layout.push(customReactComponent, summaryComponent);
    },
    { times },
  );
}

describe('CustomReact', () => {
  it('renders an app-provided React component that reads and writes form data', () => {
    addCustomReactComponent();
    cy.goto('changename');

    cy.findByText('Mellomnavn fra React').should('be.visible');
    cy.findByText('Denne komponenten er levert av appen').should('be.visible');
    cy.get('[data-testid="custom-react-language"]').should('have.text', 'Language: nb');

    const customInput = () => cy.findByRole('textbox', { name: 'Mellomnavn fra React' });
    customInput().should('have.attr', 'placeholder', 'Skriv et mellomnavn');

    // Writing in the React component updates the data model, and with it the regular Input for the same field
    customInput().type('Olav');
    cy.get(appFrontend.changeOfName.newMiddleName).should('have.value', 'Olav');
    cy.get('[data-testid="custom-react-changes"]').should('have.text', 'Changes: 4');

    // Writing in the regular Input updates the React component
    cy.get(appFrontend.changeOfName.newMiddleName).clear();
    cy.get(appFrontend.changeOfName.newMiddleName).type('Kari');
    customInput().should('have.value', 'Kari');

    // Summary2 renders the component in summary mode
    cy.get('[data-testid="custom-react-summary"]').should('have.text', 'Oppsummert: Kari');
  });

  it('exposes a frozen API that app scripts cannot replace', () => {
    addCustomReactComponent();
    cy.goto('changename');
    cy.findByRole('textbox', { name: 'Mellomnavn fra React' }).should('exist');

    cy.window().then((win) => {
      const api = win.altinnAppFrontend!;
      expect(api.apiVersion).to.equal(1);
      expect(Object.isFrozen(api)).to.equal(true);
      expect(Object.getOwnPropertyDescriptor(win, 'altinnAppFrontend')).to.include({
        writable: false,
        configurable: false,
      });
      expect(() => api.registerComponent({ name: 'test-name-input', component: () => null, apiVersion: 1 })).to.throw(
        'a component with this name is already registered',
      );
    });
  });

  it('renders the React component in the PDF', { retries: 0 }, () => {
    // The layout is fetched again when the page reloads in PDF mode
    addCustomReactComponent(2);
    cy.goto('changename');
    cy.get(appFrontend.changeOfName.newMiddleName).type('Olav');
    cy.findByRole('textbox', { name: 'Mellomnavn fra React' }).should('have.value', 'Olav');

    cy.testPdf({
      callback: () => {
        cy.findByRole('textbox', { name: 'Mellomnavn fra React' }).should('have.value', 'Olav');
        cy.get('[data-testid="custom-react-summary"]').should('have.text', 'Oppsummert: Olav');
      },
    });
  });
});
