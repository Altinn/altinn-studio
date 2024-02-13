import dot from 'dot-object';

import texts from 'test/e2e/fixtures/texts.json';
import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';
import { customReceipt } from 'test/e2e/support/customReceipt';

import { getInstanceIdRegExp } from 'src/utils/instanceIdRegExp';
import type { IInstance } from 'src/types/shared';

const mui = new Common();
const appFrontend = new AppFrontend();

let settingsCount = 0;
let layoutCount = 0;

describe('All process steps', () => {
  it('Should be possible to fill out all steps from beginning to end', () => {
    interceptAndAddCustomReceipt();

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
    cy.get(appFrontend.sendinButton).clickAndGone();

    testConfirmationPage();

    cy.get(appFrontend.confirm.sendIn).click();

    // When we first arrive to the receipt, we'll get the custom one because we intercepted and added it
    // to the redux state while filling out the form.
    // TODO: Enable this again when the custom receipt is fixed
    // testCustomReceiptPage();

    // However, when the custom receipt test refreshes the page, we'll get the default receipt, because we lost
    // the redux state from before.
    testReceiptPage();

    // When the instance has been sent in, we'll test that the data models submitted are correct, and what we expect
    // according to what we filled out during all the previous steps.
    testInstanceData();
  });
});

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

  cy.snapshot('confirm');

  // TODO: Enable this when it doesn't break custom receipt. It would be nice to make sure refreshing on a confirm step
  // restores all state and we're not stuck in any way here.
  // cy.reloadAndWait();
  // cy.get(appFrontend.confirm.container).should('be.visible');

  cy.get(appFrontend.confirm.sendIn).should('be.visible');
  cy.url().then((url) => {
    const maybeInstanceId = getInstanceIdRegExp().exec(url);
    const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';
    cy.get(appFrontend.confirm.body).contains(instanceId);
    cy.get(appFrontend.confirm.body).should('contain.text', appFrontend.apps.frontendTest);
  });
}

function interceptAndAddCustomReceipt() {
  cy.intercept('**/layoutsettings/**', (req) => {
    req.on('response', (res) => {
      settingsCount++;
      // Layout settings is returned as text/plain for some reason
      const settings = JSON.parse(res.body);
      settings.receiptLayoutName = 'receipt';
      res.body = JSON.stringify(settings);
    });
  }).as('LayoutSettings');
  cy.intercept('**/layouts/**', (req) => {
    req.on('response', (res) => {
      layoutCount++;
      // Layouts are returned as text/plain for some reason
      const layouts = JSON.parse(res.body);
      layouts.receipt = { data: { layout: customReceipt } };
      res.body = JSON.stringify(layouts);
    });
  }).as('FormLayout');
}

export function testCustomReceiptPage() {
  cy.get(appFrontend.receipt.container).should('not.exist');
  cy.get('[data-testId=custom-receipt]').should('exist').and('be.visible');
  cy.get('#form-content-r-instance').should('exist').and('be.visible');
  cy.get('#form-content-r-header').should('contain.text', 'Custom kvittering');
  cy.get('#form-content-r-paragraph').should(
    'contain.text',
    'Takk for din innsending, dette er en veldig fin custom kvittering.',
  );

  const checkAttachmentSection = (sectionId: string, title: string, attachmentCount: number) => {
    cy.get(`#form-content-${sectionId}-header`).should('contain.text', title);
    cy.get(`#form-content-${sectionId}`)
      .find('[data-testId=attachment-list]')
      .children()
      .should('have.length', attachmentCount);
  };

  checkAttachmentSection('r-attachments-one', 'Vedlegg fra første side', 1);
  checkAttachmentSection('r-attachments-other', 'Andre vedlegg', 5);
  checkAttachmentSection('r-attachments-pdf', 'Bare PDF-er', 5);
  checkAttachmentSection('r-attachments-all', 'Alle vedlegg inkludert PDF', 10);

  cy.snapshot('custom-receipt');

  /*
    Verify that layout and settings are not fetched on refresh
    This is a limitation with the current implementation that
    causes the custom receipt to not show on refresh.
  */

  let settingsBeforeRefreshCount, layoutBeforeRefreshCount;
  cy.wrap({}).then(() => {
    settingsBeforeRefreshCount = settingsCount;
    layoutBeforeRefreshCount = layoutCount;
  });
  cy.reloadAndWait().then(() => {
    expect(settingsCount).to.eq(settingsBeforeRefreshCount);
    expect(layoutCount).to.eq(layoutBeforeRefreshCount);
  });

  cy.get('[data-testId=custom-receipt]').should('not.exist');
  cy.get(appFrontend.receipt.container).should('exist').and('be.visible');
  cy.get('#attachment-collapsible-list').should('contain.text', 'Vedlegg (5)');
}

function testReceiptPage() {
  cy.get(appFrontend.receipt.container)
    .find(mui.tableBody)
    .then((table) => {
      cy.wrap(table).should('exist').and('be.visible');
      cy.wrap(table).contains(mui.tableElement, 'Mottaker').siblings().should('contain.text', texts.ttd);
    });
  cy.get(appFrontend.receipt.linkToArchive).should('be.visible');
  cy.get(appFrontend.receipt.pdf)
    .find('a')
    .should('have.length', 5) // This is the number of process data tasks
    .first()
    .should('contain.text', `${appFrontend.apps.frontendTest}.pdf`);

  cy.get(appFrontend.receipt.uploadedAttachments)
    .last()
    .find('a')
    .should('have.length', 5)
    .should('contain.text', `test.pdf`)
    .should('contain.text', `attachment-in-single.pdf`)
    .should('contain.text', `attachment-in-multi1.pdf`)
    .should('contain.text', `attachment-in-multi2.pdf`)
    .should('contain.text', `attachment-in-nested.pdf`);

  cy.get('body').should('have.css', 'background-color', 'rgb(212, 249, 228)');
  cy.get(appFrontend.header).should('contain.text', texts.ttd);

  cy.get('#attachment-collapsible-list').should('contain.text', 'Vedlegg (5)');

  cy.snapshot('receipt');
}

function testInstanceData() {
  cy.url().then((url) => {
    const urlParsed = new URL(url);
    const maybeInstanceId = getInstanceIdRegExp().exec(url);
    const instanceId = maybeInstanceId ? maybeInstanceId[1] : 'instance-id-not-found';

    const host = Cypress.env('environment') === 'local' ? urlParsed.origin : 'https://ttd.apps.tt02.altinn.no';
    const instanceUrl = [host, urlParsed.pathname, `/instances/`, instanceId].join('');

    cy.request({ url: instanceUrl }).then((response) => {
      const instanceData = response.body as IInstance;
      for (const dataElement of instanceData.data) {
        if (dataElement.contentType === 'application/xml') {
          const dataModelUrlParsed = new URL(dataElement.selfLinks!.apps);
          const dataModelUrl =
            Cypress.env('environment') === 'local' ? dataModelUrlParsed.pathname : dataElement.selfLinks!.apps;
          cy.request({
            url: dataModelUrl,
          }).then((response) => {
            const dataModel = replaceVariableData(response.body);
            const knownModel = knownDataModels[dataElement.dataType];
            if (dataElement.dataType === 'ServiceModel-test') {
              dot.str(
                'Innledning-grp-9309.Kontaktinformasjon-grp-9311.MelderFultnavn.value',
                Cypress.env('defaultFullName'),
                knownModel,
              );
            }
            expect(dataModel).to.deep.equal(knownModel);
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
function replaceVariableData(input: any) {
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
    return input.map((value) => replaceVariableData(value));
  }
  if (typeof input === 'object' && input !== null) {
    return Object.fromEntries(Object.entries(input).map(([key, value]) => [key, replaceVariableData(value)]));
  }
  return input;
}

const knownDataModels: { [key: string]: any } = {
  message: {
    ProcessTask: null,
    Title: null,
    Body: null,
    Reference: null,
    Sender: null,
    SomeNumberValue: null,
    IsSomeValue: null,
  },
  'ServiceModel-test': {
    skjemanummer: 1533,
    spesifikasjonsnummer: 11172,
    blankettnummer: 'RF-1453',
    tittel: 'Endring av navn',
    gruppeid: 9308,
    etatid: null,
    'Innledning-grp-9309': {
      gruppeid: 9309,
      'NavneendringenGjelderFor-grp-9310': {
        gruppeid: 9310,
        'MeldingMeldingsmottakerFodselsnummer-datadef-33548': null,
        'SubjektFodselsnummer-datadef-34727': null,
        'SubjektFornavnFolkeregistrert-datadef-34730': { orid: 34730, value: 'a a' },
        'SubjektMellomnavnFolkeregistrert-datadef-34731': null,
        'SubjektEtternavnFolkeregistrert-datadef-34729': null,
      },
      'Signerer-grp-9320': {
        gruppeid: 9320,
        'SignererEkstraFodselsnummer-datadef-34744': null,
        'SignererEkstraEtternavn-datadef-34745': null,
        'SignererEkstraFornavn-datadef-34746': null,
        'SignererEkstraMellomnavn-datadef-34747': null,
        'SignererEkstraEpost-datadef-34749': null,
        'SignererEkstraMobiltelefonsnummer-datadef-34750': null,
        'SignererEkstraReferanseAltinn-datadef-34751': { orid: 34751, value: 'altinn' },
        'SignererEkstraArkivDato-datadef-34752': { orid: 34752, value: 'ANY_DATE' },
        'SignererEkstraTidspunkt-datadef-34753': null,
        'SignererEkstraAksept-datadef-34754': null,
        'SignererEkstraMalform-datadef-34895': null,
      },
      'TredjeSignerer-grp-9349': null,
      'Kontaktinformasjon-grp-9311': {
        gruppeid: 9311,
        'MeldingFodselsnummer-datadef-34734': null,
        'MelderFornavn-datadef-34736': null,
        'MelderMellomnavn-datadef-34737': null,
        'MelderEtternavn-datadef-34735': null,
        MelderFultnavn: { orid: 34735, value: 'WILL BE REPLACED WITH THE USERS NAME' },
        'MelderEpost-datadef-34739': null,
        'MelderMobiltelefonnummer-datadef-34740': null,
        'MelderArkivDato-datadef-34741': null,
        'MelderArkivTidspunkt-datadef-34742': null,
        'MelderReferanseAltinn-datadef-34743': null,
        'MelderMalform-datadef-34882': null,
      },
      'SamtykkeTilElektroniskKommunikasjon-grp-9312': null,
    },
    'NyttNavn-grp-9313': {
      gruppeid: 9313,
      'NyttNavn-grp-9314': {
        gruppeid: 9314,
        'PersonEtternavnNytt-datadef-34757': { orid: 34757, value: 'a' },
        'PersonFornavnNytt-datadef-34758': { orid: 34758, value: 'a' },
        'PersonMellomnavnNytt-datadef-34759': null,
        PersonBekrefterNyttNavn: { orid: 34760, value: 'Ja' },
      },
    },
    'Tilknytning-grp-9315': {
      gruppeid: 9315,
      'TilknytningTilNavnet-grp-9316': {
        gruppeid: 9316,
        'TilknytningEtternavn1-grp-9350': {
          gruppeid: 9350,
          'PersonEtternavnForste-datadef-34896': { orid: 34896, value: 'test' },
          'PersonEtternavnForsteTilknytningstype-datadef-34897': null,
          'PersonEtternavnForsteTilknytningBeskrivelse-datadef-34898': null,
          'PersonEtternavnForsteTilknyttetPersonsFodselsnummer-datadef-34899': null,
          'PersonEtternavnForsteTilknyttetPersonsEtternavn-datadef-34900': null,
          'PersonEtternavnForsteTilknyttetGardNavn-datadef-34901': null,
          'PersonEtternavnForsteTilknyttetGardKommunenummer-datadef-34902': null,
          'PersonEtternavnForsteTilknyttetGardGardsnummer-datadef-34903': null,
          'PersonEtternavnForsteTilknyttetGardBruksnummer-datadef-34904': null,
          'PersonEtternavnForsteTilknyttetGardFesteavgift-datadef-34905': null,
        },
        'TilknytningEtternavn2-grp-9351': null,
        'TilknytningMellomnavn1-grp-9352': null,
        'TilknytningMellomnavn2-grp-9353': null,
        'TilknytningMellomnavn3-grp-9354': null,
        'TilknytningMellomnavnEkstra-grp-9355': null,
      },
    },
    'Begrunnelse-grp-9317': null,
    Radioknapp: '1',
    BegrunnelseFrivillig: '1',
    Adresse: {
      Gateadresse_æøå: null,
      Postnr: null,
      Poststed: null,
      Kommune: null,
      KommunerMetadata: 'language=nb,id=131,variant=,date=ANY_DATE,level=,parentCode=',
    },
    GridData: {
      TotalGjeld: 1000000,
      Bolig: { Prosent: 80, Belop: 800000, Verifisert: null, IBruk: null },
      Studie: { Prosent: 15, Belop: 150000, Verifisert: null, IBruk: null },
      Kredittkort: { Prosent: 5, Belop: 50000, Verifisert: null, IBruk: null },
      TotalProsent: 100,
      ShowAll: null,
      Examples: null,
    },
    TestCustomButtonInput: null,
    TestCustomButtonReadOnlyInput: null,
    neverValidatedInput: null,
  },
  'nested-group': {
    skjemanummer: 1603,
    spesifikasjonsnummer: 12392,
    hideRowValue: 99999999,
    sumAll: 0,
    sumAboveLimit: 0,
    numAboveLimit: 0,
    blankettnummer: 'RF-1366',
    tittel: 'Endringsmelding',
    gruppeid: 9785,
    etatid: null,
    'Endringsmelding-grp-9786': {
      gruppeid: 9786,
      'Avgiver-grp-9787': {
        gruppeid: 9787,
        'OppgavegiverNavn-datadef-68': { orid: 68, value: 'automation' },
        'OppgavegiverFodselsnummer-datadef-26': null,
        'KontaktpersonEPost-datadef-27688': { orid: 27688, value: 'Ja' },
        'KontaktpersonTelefonnummer-datadef-3': null,
      },
      'OversiktOverEndringene-grp-9788': [
        {
          gruppeid: 9788,
          'SkattemeldingEndringEtterFristPost-datadef-37130': null,
          'SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131': { orid: 37131, value: 1 },
          'SkattemeldingEndringEtterFristNyttBelop-datadef-37132': { orid: 37132, value: 2 },
          'SkattemeldingEndringEtterFristKommentar-datadef-37133': null,
          fileUpload: 'ANY_UUID',
          fileUploadList: ['ANY_UUID', 'ANY_UUID'],
          isPrefill: false,
          'nested-grp-1234': [
            {
              gruppeid: 1234,
              hideComment: null,
              'SkattemeldingEndringEtterFristPost-datadef-37130': null,
              'SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131': null,
              'SkattemeldingEndringEtterFristNyttBelop-datadef-37132': null,
              'SkattemeldingEndringEtterFristKommentar-datadef-37133': { orid: 37133, value: 'automation' },
              fileUpload: null,
              fileUploadList: ['ANY_UUID'],
              extraOptionsToggle: null,
              extraOptions: null,
              source: 'annet',
              reference: 'test',
            },
          ],
          source: 'digdir',
          reference: 'salt',
        },
      ],
      Gruppe2: [],
    },
    PrefillValues: null,
    PrefillValuesShadow: null,
    PrefillValuesEnabled: true,
    Group2Teller: 0,
  },
  likert: {
    Questions: [
      {
        Id: 'question-1',
        Answer: null,
      },
      {
        Id: 'question-2',
        Answer: null,
      },
      {
        Id: 'question-3',
        Answer: null,
      },
      {
        Id: 'question-4',
        Answer: '1',
      },
      {
        Id: 'question-5',
        Answer: '2',
      },
      {
        Id: 'question-6',
        Answer: '3',
      },
    ],
  },
  datalist: {
    UseCustomConfirm: false,
    SelectedItem: 'Caroline',
    SelectedItemProfession: 'Utvikler',
    Search: null,
  },
};
