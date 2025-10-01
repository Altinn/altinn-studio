import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';

const appFrontend = new AppFrontend();

describe('readonly data models', () => {
  beforeEach(() => {
    cy.startAppInstance(appFrontend.apps.multipleDatamodelsTest);
  });

  it('can show data models from previous tasks as read only', () => {
    cy.findByRole('textbox', { name: /tekstfelt 1/i }).type('første');
    cy.findByRole('textbox', { name: /tekstfelt 2/i }).type('andre');

    cy.gotoNavPage('Side2');
    cy.findAllByRole('checkbox').eq(2).click();
    cy.findAllByRole('checkbox').eq(3).click();
    cy.findAllByRole('checkbox').eq(4).click();

    cy.gotoNavPage('Side3');

    const today = new Date();
    const age1 = 36;
    const y1 = today.getFullYear() - age1;
    const m = (today.getMonth() + 1).toString().padStart(2, '0'); // Month is 0-indexed
    const d = today.getDate().toString().padStart(2, '0');
    const age2 = 25;
    const y2 = today.getFullYear() - age2;

    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.findByRole('textbox', { name: /fornavn/i }).type('Per');
    cy.findByRole('textbox', { name: /etternavn/i }).type('Hansen');
    cy.findByRole('textbox', { name: /fødselsdato/i }).type(`${d}.${m}.${y1}`);
    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();

    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.findByRole('textbox', { name: /fornavn/i }).type('Hanne');
    cy.findByRole('textbox', { name: /etternavn/i }).type('Persen');
    cy.findByRole('textbox', { name: /fødselsdato/i }).type(`${d}.${m}.${y2}`);
    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();

    const errorReportTitle = /Du må rette disse feilene før du kan gå videre/i;
    cy.gotoNavPage('Side6');
    cy.findByRole('radio', { name: /kåre/i }).dsCheck();
    cy.findByText(errorReportTitle).should('not.exist');
    cy.findByRole('button', { name: /send inn/i }).click();

    cy.findByRole('heading', { name: /fra forrige steg/i }).should('be.visible');
    cy.findByText(errorReportTitle).should('not.exist');

    cy.get(appFrontend.multipleDatamodelsTest.textField1Summary).should('contain.text', 'første');
    cy.get(appFrontend.multipleDatamodelsTest.textField2Summary).should('contain.text', 'andre');
    cy.get(appFrontend.multipleDatamodelsTest.sectorSummary).should('contain.text', 'Privat');
    cy.get(appFrontend.multipleDatamodelsTest.industrySummary).should(
      'contain.text',
      'Elektronikk og telekommunikasjon',
    );
    cy.get(appFrontend.multipleDatamodelsTest.industrySummary).should('contain.text', 'Forskning og utvikling');
    cy.get(appFrontend.multipleDatamodelsTest.industrySummary).should('contain.text', 'IKT (data/IT)');
    cy.get(appFrontend.multipleDatamodelsTest.personsSummary).should('contain.text', 'Fornavn : Per');
    cy.get(appFrontend.multipleDatamodelsTest.personsSummary).should('contain.text', 'Etternavn : Hansen');
    cy.get(appFrontend.multipleDatamodelsTest.personsSummary).should('contain.text', 'Alder : 36 år');
    cy.get(appFrontend.multipleDatamodelsTest.personsSummary).should('contain.text', 'Fornavn : Hanne');
    cy.get(appFrontend.multipleDatamodelsTest.personsSummary).should('contain.text', 'Etternavn : Persen');
    cy.get(appFrontend.multipleDatamodelsTest.personsSummary).should('contain.text', 'Alder : 25 år');

    const formDataRequests: string[] = [];
    cy.intercept('PATCH', '**/data*', (req) => {
      formDataRequests.push(req.url);
    }).as('saveFormData');

    cy.findByRole('textbox', { name: /tekstfelt 3/i }).type('Litt mer informasjon');
    cy.waitUntilSaved();
    cy.then(() => expect(formDataRequests.length).to.be.eq(1));

    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.waitUntilSaved();
    cy.then(() => expect(formDataRequests.length).to.be.eq(2));

    cy.findByRole('textbox', { name: /e-post/i }).type('test@test.test');
    cy.waitUntilSaved();
    cy.then(() => expect(formDataRequests.length).to.be.eq(3));

    cy.findByRole('textbox', { name: /mobilnummer/i }).type('98765432');
    cy.waitUntilSaved();
    cy.then(() => expect(formDataRequests.length).to.be.eq(4));

    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();
    cy.waitUntilSaved();
    cy.then(() => expect(formDataRequests.length).to.be.eq(4));

    cy.findByText(errorReportTitle).should('not.exist');

    // Test with autoSaveBehavior onChangePage in order to test that requestManualSave works as expected
    cy.interceptLayoutSetsUiSettings({ autoSaveBehavior: 'onChangePage' });
    cy.then(() => formDataRequests.splice(0, formDataRequests.length)); // Clear requests
    cy.reloadAndWait();

    cy.findByRole('textbox', { name: /tekstfelt 3/i }).clear();
    cy.findByRole('textbox', { name: /tekstfelt 3/i }).type('Noe annet denne gangen');
    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.findByRole('textbox', { name: /e-post/i }).type('test123@test.test');
    cy.findByRole('textbox', { name: /mobilnummer/i }).type('12345678');
    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();

    cy.waitForNetworkIdle(400);

    cy.then(() => expect(formDataRequests.length).to.be.eq(0));

    cy.findByRole('button', { name: 'Neste' }).click();

    cy.findByRole('heading', { name: /tittel/i }).should('be.visible');
    cy.waitUntilSaved();

    cy.then(() => expect(formDataRequests.length).to.be.eq(1));
    cy.findByText(errorReportTitle).should('not.exist');

    cy.findByRole('button', { name: 'Forrige' }).click();
    cy.findByRole('button', { name: 'Send inn' }).click();

    cy.findByRole('heading', { name: /kvittering/i }).should('be.visible');
    cy.get(appFrontend.multipleDatamodelsTest.textField1Summary).should('contain.text', 'første');
    cy.get(appFrontend.multipleDatamodelsTest.textField2Paragraph).should('contain.text', 'andre');
    cy.get(appFrontend.multipleDatamodelsTest.textField3Summary).should('contain.text', 'Noe annet denne gangen');

    cy.findByText(errorReportTitle).should('not.exist');
  });
});
