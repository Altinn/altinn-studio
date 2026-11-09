import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import type { IInstance, IProcess } from 'src/types/shared';

type PreviewInstance = IInstance & { process?: IProcess };

const appFrontend = new AppFrontend();
const firstSubform = 'First preview subform';
const secondSubform = 'Second preview subform';

// Render data already collected in earlier tasks without advancing the process.
describe('PDF service task previews', { testIsolation: false }, () => {
  // Reuse one filled instance. Only the final test advances it to a service task.
  let formUrl = '';

  before(() => {
    cy.startAppInstance(appFrontend.apps.serviceTask, { cyUser: 'manager' });
    cy.findByRole('textbox', { name: 'En tekst i Task_Utfylling1' }).type('Preview main form');
    for (const value of [firstSubform, secondSubform]) {
      cy.get('#subform-Subform-z8we7d-add-button').click();
      cy.findByRole('textbox', { name: 'Subform tekstfelt' }).type(value);
      cy.findByRole('button', { name: 'Ferdig' }).click();
    }
    cy.waitUntilSaved();
    cy.findByRole('button', { name: 'Neste' }).click();
    cy.get('#finishedLoading').should('exist');
    cy.waitForNetworkIdle('*', '*', 500);
    cy.findByRole('textbox', { name: 'En tekst i Task_Utfylling2' }).type('Preview second task');
    cy.findByRole('textbox', { name: 'En tekst i Task_Utfylling2' }).should('have.value', 'Preview second task');
    cy.get('body').click();
    cy.waitUntilSaved();
    if (Cypress.env('type') === 'localtest') {
      cy.setCookie('frontendVersion', encodeURIComponent(`http://${Cypress.env('host') || 'localhost:8080'}/`));
    }
    cy.location('href').then((href) => {
      formUrl = href;
    });
  });

  beforeEach(() => {
    cy.setEmulatedMedia();
    cy.visit(formUrl);
    cy.get('#finishedLoading').should('exist');
    const instanceId = getInstanceIdRegExp().exec(formUrl)?.[1];
    expect(instanceId).to.be.a('string');
    const appRoot = formUrl.split('#')[0].replace(/\/$/, '');
    const instanceUrl = `${appRoot}/instances/${instanceId}`;
    cy.wrap(instanceUrl).as('instanceUrl');
    snapshotInstance(instanceUrl, 'Task_Utfylling2');
  });

  it('previews current and configured tasks without changing the instance', { retries: 0 }, () => {
    cy.log('Normal navigation still blocks another task');
    cy.location('href').then((href) => {
      cy.visit(previewUrl(href, 'Task_PDF_Layout/Side1').replace('?pdf=1', ''));
    });
    cy.findByRole('button', { name: 'Gå til riktig prosessteg' }).should('be.visible').click();
    cy.get('#finishedLoading').should('exist');
    assertInstanceUnchanged();

    cy.log('Current-task PDF');
    requestPreview();
    cy.testPdf({
      freeze: false,
      callback: () => cy.findByText('Preview second task').should('be.visible'),
    });
    assertInstanceUnchanged();

    cy.log('Configured PDF layout');
    requestPreview('Task_PDF_Layout');
    cy.testPdf({
      freeze: false,
      buildUrl: (href) => previewUrl(href, 'Task_PDF_Layout'),
      callback: () => {
        cy.findByText('Preview main form').should('be.visible');
        cy.findByText('Preview second task').should('be.visible');
      },
    });
    assertInstanceUnchanged();

    cy.log('Automatic PDF assembled from multiple tasks');
    requestPreview('Task_PDF_Auto');
    cy.testPdf({
      freeze: false,
      buildUrl: (href) => `${previewUrl(href, 'Task_PDF_Auto')}&task=Task_Utfylling1&task=Task_Utfylling2`,
      callback: () => {
        cy.findByText('Preview main form').should('be.visible');
        cy.findByText('Preview second task').should('be.visible');
        cy.findByText(firstSubform).should('be.visible');
        cy.findByText(secondSubform).should('be.visible');
      },
    });
    assertInstanceUnchanged();
  });

  it('renders previous-task subforms while a service task is active', { retries: 0 }, () => {
    cy.findByRole('radiogroup', { name: /Skal Task_Fail servicetask feile\?/ })
      .findByRole('radio', { name: 'Ja' })
      .click();
    cy.waitUntilSaved();
    cy.get<string>('@instanceUrl').then((instanceUrl) => {
      cy.getCookie('XSRF-TOKEN').then((token) => {
        // The deliberate failure leaves the real backend process on Task_Fail.
        cy.request({
          method: 'PUT',
          url: `${instanceUrl}/process/next`,
          headers: { 'X-XSRF-TOKEN': token?.value },
          failOnStatusCode: false,
          timeout: 120_000,
        })
          .its('status')
          .should('eq', 500);
      });
      cy.location('href').then((href) => {
        cy.visit(previewUrl(href, 'Task_Fail/Side1').replace('?pdf=1', ''));
      });
      cy.get('#finishedLoading').should('exist');
      snapshotInstance(instanceUrl, 'Task_Fail');
    });
    cy.get<PreviewInstance>('@instanceBefore').then((instance) => {
      const subforms = instance.data.filter((element) => element.dataType === 'SubformModel');
      expect(subforms).to.have.length(2);
      subforms.forEach((element, index) => {
        requestPreview('SubformPdf', element.id);
        cy.testPdf({
          freeze: false,
          buildUrl: (href) => previewUrl(href, `SubformPdf/subform/Subform-z8we7d/${element.id}/`),
          callback: () => {
            cy.findByRole('heading', { name: 'Selected subform PDF layout' }).should('be.visible');
            cy.findByRole('textbox', { name: 'Selected subform' }).should(
              'have.value',
              index === 0 ? firstSubform : secondSubform,
            );
            cy.findByDisplayValue(index === 0 ? secondSubform : firstSubform, { timeout: 0 }).should('not.exist');
            cy.findByDisplayValue('Preview main form', { timeout: 0 }).should('not.exist');
            cy.findByText('Service task wrapper must not appear in the subform PDF', { timeout: 0 }).should(
              'not.exist',
            );
          },
        });
      });
    });
    assertInstanceUnchanged('Task_Fail');
    cy.setEmulatedMedia();
  });
});

function previewUrl(href: string, taskPath: string) {
  const instanceId = getInstanceIdRegExp().exec(href)?.[1];
  const before = href.split(getInstanceIdRegExp())[0];
  return `${before}${instanceId}/${taskPath}?pdf=1`;
}

function requestPreview(taskId?: string, dataElementId?: string) {
  cy.get<string>('@instanceUrl').then((instanceUrl) => {
    cy.request({
      url: `${instanceUrl}/pdf/preview`,
      qs: { ...(taskId ? { taskId } : {}), ...(dataElementId ? { dataElementId } : {}) },
      encoding: 'binary',
      timeout: 120_000,
    }).then((response) => {
      expect(response.status).to.equal(200);
      expect(response.headers['content-type']).to.include('application/pdf');
      expect(response.body.slice(0, 5)).to.equal('%PDF-');
    });
  });
}

function snapshotInstance(instanceUrl: string, currentTask: string) {
  cy.request<PreviewInstance>(instanceUrl).then(({ body }) => {
    expect(body.process?.currentTask?.elementId).to.equal(currentTask);
    cy.wrap(body).as('instanceBefore');
    const models: Record<string, unknown> = {};
    body.data.forEach((element) => {
      cy.request(`${instanceUrl}/data/${element.id}`).then(({ body: data }) => {
        models[element.id] = data;
      });
    });
    cy.wrap(models).as('modelsBefore');
  });
}

function assertInstanceUnchanged(currentTask = 'Task_Utfylling2') {
  cy.get<string>('@instanceUrl').then((instanceUrl) => {
    cy.get<PreviewInstance>('@instanceBefore').then((before) => {
      cy.request<PreviewInstance>(instanceUrl).then(({ body }) => {
        expect(body).to.deep.equal(before);
        expect(body.process?.currentTask?.elementId).to.equal(currentTask);
        cy.get<Record<string, unknown>>('@modelsBefore').then((models) => {
          body.data.forEach((element) => {
            cy.request(`${instanceUrl}/data/${element.id}`).its('body').should('deep.equal', models[element.id]);
          });
        });
      });
    });
  });
}
