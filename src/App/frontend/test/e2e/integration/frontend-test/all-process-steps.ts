import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { customReceiptPageAnother, customReceiptPageReceipt } from 'test/e2e/support/customReceipt';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import type { ILayoutCollection } from 'src/layout/layout';
import type { IInstance } from 'src/types/shared';
import type { AltinnAppData } from 'src/types/window';

const appFrontend = new AppFrontend();

describe('All process steps', () => {
  it('Should be possible to fill out all steps from beginning to end', () => {
    cy.goto('message');
    // Later in this test we will make sure PDFs are created, so we need to set the cookie to
    // convince the backend to create them
    cy.setCookie('createPdf', 'true');
    cy.get(appFrontend.sendinButton).clickAndGone();

    cy.fillOut('changename');
    cy.get(appFrontend.sendinButton).clickAndGone();

    cy.fillOut('group');
    cy.get(appFrontend.sendinButton).clickAndGone();

    cy.fillOut('likert');
    cy.get(appFrontend.sendinButton).clickAndGone();

    cy.fillOut('datalist');
    testAllSummary2();

    cy.get(appFrontend.sendinButton).clickAndGone();
    testConfirmationPage();

    interceptAndAddInstanceSubstatus();
    cy.get(appFrontend.confirm.sendIn).click();
    testReceipt();

    interceptAndAddInstanceSubstatus();
    interceptAndAddCustomReceipt();

    testCustomReceiptPage();

    // When the instance has been sent in, we'll test that the data models submitted are correct, and what we expect
    // according to what we filled out during all the previous steps.
    // cy.pause();
    testInstanceData();
  });
});

function testAllSummary2() {
  cy.findByRole('button', { name: /Neste/ }).click();
  cy.findAllByTestId('summary-single-value-component').first().should('contain.text', 'Task_2');

  // WCAG test fails here, and we have no good way to register the wrong heading order as expected in this case, since
  // we run multiple snapshots (and thus multiple wcag tests) in this larger test.
  cy.visualTesting('all-summary2', { wcag: false });

  cy.findByRole('button', { name: /Forrige/ }).click();
}

function testConfirmationPage() {
  cy.get(appFrontend.confirm.container).should('be.visible');
  cy.get(appFrontend.confirm.body).should('contain.text', texts.confirmBody);
  cy.get(appFrontend.confirm.receiptPdf)
    .find('a')
    .should('have.length', 5) // This is the number of process data tasks
    .first()
    .should('contain.text', `${appFrontend.apps.frontendTest}.pdf`);

  cy.get(appFrontend.confirm.uploadedAttachments)
    .last()
    .find('a')
    .should('have.length', 5)
    .should('contain.text', `test.pdf`)
    .should('contain.text', `attachment-in-single.pdf`)
    .should('contain.text', `attachment-in-multi1.pdf`)
    .should('contain.text', `attachment-in-multi2.pdf`)
    .should('contain.text', `attachment-in-nested.pdf`);

  cy.visualTesting('confirm');

  cy.reloadAndWait();
  cy.get(appFrontend.confirm.container).should('be.visible');

  cy.get(appFrontend.confirm.sendIn).should('be.visible');
  cy.url().then((url) => {
    const maybeInstanceId = getInstanceIdRegExp().exec(url);
    const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
    cy.get(appFrontend.confirm.body).contains(instanceId);
    cy.get(appFrontend.confirm.body).should('contain.text', appFrontend.apps.frontendTest);
  });
}

function interceptAndAddInstanceSubstatus() {
  cy.intercept('**/instances/*/*', (req) => {
    req.on('response', (res) => {
      const instance = res.body as IInstance;
      instance.status = {
        substatus: {
          label: 'substatus.label',
          description: 'substatus.description',
        },
      };
    });
  }).as('Instance');
}

function testReceipt() {
  cy.get(appFrontend.receipt.container).should('be.visible');
  cy.findByText('Skjemaet er sendt inn').should('be.visible');
  cy.findByRole('link', { name: 'Kopi av din kvittering er sendt til ditt arkiv' }).should('be.visible');

  cy.findAllByRole('link', { name: 'Nedlasting frontend-test.pdf' }).should('have.length', 5);
  cy.findAllByRole('link', { name: /^Nedlasting attachment-in-.*?\.pdf$/ }).should('have.length', 4);
  cy.findByRole('link', { name: 'Nedlasting test.pdf' }).should('be.visible');
  cy.findAllByRole('link', { name: /pdf$/ }).should('have.length', 5 + 4 + 1);

  testReceiptSubStatus();

  cy.visualTesting('receipt');
}

function testReceiptSubStatus() {
  cy.findByText('Godkjent').should('be.visible');
  cy.findByText(
    'Søknaden er godkjent og sendt til Folkeregisteret for behandling. ' +
      'Du vil motta en bekreftelse når søknaden er behandlet.',
  ).should('be.visible');
}

function interceptAndAddCustomReceipt() {
  // Intercept the HTML response from the backend and modify window.AltinnAppData
  cy.intercept('GET', '**/ProcessEnd', (req) => {
    req.continue((res) => {
      if (res.body && typeof res.body === 'string') {
        // Find and modify the window.AltinnAppData assignment in the HTML
        // Look for the pattern: window.AltinnAppData = {...}; followed by window.org
        const startMarker = 'window.AltinnAppData = ';
        const endMarker = ';\n      window.org';

        const startIndex = res.body.indexOf(startMarker);
        const endIndex = res.body.indexOf(endMarker, startIndex);

        if (startIndex !== -1 && endIndex !== -1) {
          try {
            const jsonStart = startIndex + startMarker.length;
            const jsonData = res.body.substring(jsonStart, endIndex);
            const data = JSON.parse(jsonData);

            if (data.layoutSets?.sets) {
              data.layoutSets.sets.push({
                id: 'custom-receipt',
                dataType: 'likert',
                tasks: ['CustomReceipt'],
              });
            }

            const modifiedJson = JSON.stringify(data);
            res.body = res.body.substring(0, jsonStart) + modifiedJson + res.body.substring(endIndex);
          } catch (e) {
            console.error('Failed to modify AltinnAppData:', e);
          }
        }
      }
    });
  }).as('ProcessEndHTML');

  // Layout settings and layouts are still fetched by the frontend, so intercept those
  cy.intercept('**/layoutsettings/custom-receipt**', { pages: { order: ['receipt', 'another'] } }).as('LayoutSettings');

  cy.intercept('**/layouts/custom-receipt', (req) => {
    req.on('response', (res) => {
      // Layouts are returned as text/plain for some reason
      const layouts = JSON.parse(res.body) as ILayoutCollection;
      layouts.receipt = { data: { layout: customReceiptPageReceipt } };
      layouts.another = { data: { layout: customReceiptPageAnother } };
      res.body = JSON.stringify(layouts);
    });
  }).as('FormLayout');
}

export function testCustomReceiptPage() {
  cy.waitUntilSaved();
  cy.url().then((url) => {
    cy.visit(url, {
      onBeforeLoad(win: Window & { AltinnAppData?: AltinnAppData }) {
        const patch = (v: AltinnAppData) => ({
          ...v,
          layoutSets: {
            ...v?.layoutSets,
            sets: [
              ...(v?.layoutSets?.sets ?? []),
              { id: 'custom-receipt', dataType: 'likert', tasks: ['CustomReceipt'] },
            ],
          },
          instance: {
            ...v.instance,
            status: {
              substatus: {
                label: 'substatus.label',
                description: 'substatus.description',
              },
            },
          },
        });

        // Closure-backed storage to avoid recursive reads
        let backing = {}; // safe default in case something reads before the app assigns

        Object.defineProperty(win, 'AltinnAppData', {
          configurable: true,
          enumerable: true,
          get() {
            return backing;
          },
          set(v) {
            // capture the app's inline assignment and patch it
            backing = patch(v ?? {});
          },
        });

        // Optional debug without triggering recursion
        win.addEventListener('DOMContentLoaded', () => {
          console.log('AltinnAppData after inline assignment:', backing);
        });
      },
    });
  });

  cy.get('#finishedLoading').should('exist');
  cy.findByRole('progressbar').should('not.exist');
  cy.injectAxe();

  cy.get(appFrontend.receipt.container).should('not.exist');
  cy.findByText('Custom kvittering').should('be.visible');
  cy.findByText('Takk for din innsending, dette er en veldig fin custom kvittering.').should('be.visible');
  testReceiptSubStatus();

  const checkAttachmentSection = (sectionId: string, title: string, attachmentCount: number) => {
    cy.get(`#form-content-${sectionId}-header`).should('contain.text', title);
    cy.get(`#form-content-${sectionId}`)
      .find('[data-testId=attachment-list] > ul')
      .children()
      .should('have.length', attachmentCount);
  };
  checkAttachmentSection('r-attachments-one', 'Vedlegg fra første side', 1);
  checkAttachmentSection('r-attachments-other', 'Andre vedlegg', 5);
  checkAttachmentSection('r-attachments-pdf', 'Bare PDF-er', 5);
  checkAttachmentSection('r-attachments-all', 'Alle vedlegg inkludert PDF', 10);
  // Assert that receipts now support multiple pages
  cy.findByRole('button', { name: /Neste/ }).click();
  cy.findByText('Dette er neste side').should('exist');
  cy.findByRole('button', { name: /Forrige/ }).click();

  cy.visualTesting('custom-receipt');
}

function testInstanceData() {
  cy.url().then((url) => {
    const urlParsed = new URL(url);
    const maybeInstanceId = getInstanceIdRegExp().exec(url);
    const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
    const host = Cypress.env('type') === 'localtest' ? urlParsed.origin : 'https://ttd.apps.tt02.altinn.no';
    const instanceUrl = `${host}/ttd/frontend-test/instances/${instanceId}`;

    cy.request({ url: instanceUrl }).then((response) => {
      const instanceData = response.body as IInstance;
      for (const dataElement of instanceData.data) {
        if (dataElement.contentType === 'application/xml') {
          const dataModelUrlParsed = new URL(dataElement.selfLinks!.apps);
          const dataModelUrl =
            Cypress.env('type') === 'localtest' ? dataModelUrlParsed.pathname : dataElement.selfLinks!.apps;
          cy.request({
            url: dataModelUrl,
          }).then((response) => {
            cy.log(`Testing data model "${dataElement.dataType}"`);
            cy.wrap(replaceVariableData(response.body)).snapshot({ name: dataElement.dataType });
          });
        }
      }
    });
  });
}

function isUuid(value: string) {
  return value.match(/^[a-f\d]{8}(-[a-f\d]{4}){4}[a-f\d]{8}$/i);
}

const regexDate1 = /^\d{4}-\d{2}-\d{2}$/;
const regexDate2 = /^\d{2}[./]\d{2}[./]\d{4}$/;

function replaceVariableData(input: unknown, path: string = '') {
  if (path === 'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.value') {
    return 'ANY_FIRST_NAME_LAST_NAME';
  }
  if (typeof input === 'string' && isUuid(input)) {
    return 'ANY_UUID';
  }
  if (typeof input === 'string' && (input.match(regexDate1) || input.match(regexDate2))) {
    // Replaces dates (YYYY-MM-DD, DD.MM.YYYY, DD/MM/YYYY)
    return 'ANY_DATE';
  }
  if (typeof input === 'string' && input.includes('date=')) {
    // Replaces dates in the KommunerMetadata field
    return input.replace(/date=[^,]+/, 'date=ANY_DATE');
  }
  if (Array.isArray(input)) {
    const result: unknown[] = [];
    for (const [idx, value] of input.entries()) {
      result.push(replaceVariableData(value, `${path}[${idx}]`));
    }
    return result;
  }
  if (typeof input === 'object' && input !== null) {
    const result = {};
    for (const [key, value] of Object.entries(input)) {
      result[key] = replaceVariableData(value, `${path}.${key}`.replace(/^\./, ''));
    }
    return result;
  }
  return input;
}
