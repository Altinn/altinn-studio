import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import type { FrontendTestTask, StartAppInstanceOptions } from 'test/e2e/support/global';

const appFrontend = new AppFrontend();

interface Context {
  baseUrl: string;
}

interface ExtraOutput {
  code: string;
  urlSuffix?: string;
}

type Extras = (context: Context) => ExtraOutput;

/**
 * Functions used by goto() to quickly pretend to fill out a certain layout.
 * These should always complete the task fully, i.e. end the task and move to the next one after it.
 * It never generates a PDF for the previous tasks.
 */
const gotoFunctions: { [key in FrontendTestTask]: (extra?: Extras, startOptions?: StartAppInstanceOptions) => void } = {
  message: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    cy.intercept('**/active', []).as('noActiveInstances');
    if (extra) {
      throw new Error('Extra not supported for message navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, startOptions);
    cy.findByRole('link', { name: /tilbake til innboks/i }).should('be.visible');
  },
  changename: (_?: Extras, startOptions?: StartAppInstanceOptions) => {
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
      // evaluateBefore: generateEvalString('changename', extra),
    });

    // Click the task chooser button if it exists
    cy.get('#custom-button-taskChooserButton').should('exist').click();
    // Click the radio button for "Endring av navn (Task_2)"
    cy.findByRole('radio', { name: 'Endring av navn (Task_2)' }).should('exist').click();

    cy.get('#sendInButtonOnTaskChooser').should('exist').click();
  },
  group: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for group navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
    });
  },
  likert: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for likert navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
    });
  },
  datalist: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for datalist navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
      // evaluateBefore: generateEvalString('datalist'),
    });
  },
  confirm: (extra?: Extras, startOptions?: StartAppInstanceOptions) => {
    if (extra) {
      throw new Error('Extra not supported for confirm navigator');
    }
    cy.startAppInstance(appFrontend.apps.frontendTest, {
      ...startOptions,
    });
  },
};

Cypress.Commands.add('goto', (task, options) => {
  gotoFunctions[task](undefined, options);
  cy.findByRole('progressbar').should('not.exist');
});

Cypress.Commands.add('gotoHiddenPage', (target) => {
  gotoFunctions.changename(({ baseUrl }) => ({
    urlSuffix: `/Task_2/${target}`,
    code: [
      `var instanceDataNew = await fetch('${baseUrl}/instances/' + instanceId, { headers }).then((res) => res.json());`,
      `var changeNameModel = instanceDataNew.data.find((data) => data.dataType === 'ServiceModel-test');`,
      `var dataModel = await fetch('${baseUrl}/instances/' + instanceId + '/data/' + changeNameModel.id, { headers }).then((res) => res.json());`,
      `dataModel['NyttNavn-grp-9313'] = {
        'NyttNavn-grp-9314': {
          'PersonFornavnNytt-datadef-34758': { value: 'a' },
          'PersonBekrefterNyttNavn': { value: 'Ja' },
        }
      }`,
      `dataModel.ChooseExtraPages = "${target}";`,
      `await fetch('${baseUrl}/instances/' + instanceId + '/data/' + changeNameModel.id,
        { method: 'PUT', headers, body: JSON.stringify(dataModel) });`,
    ].join('\n'),
  }));
  cy.findByRole('progressbar').should('not.exist');
});
