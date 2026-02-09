import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { interceptAltinnAppGlobalData } from 'test/e2e/support/intercept-global-data';

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
    cy.waitUntilSaved();
    cy.findByRole('button', { name: /send inn/i }).click();
    cy.get('#finishedLoading').should('exist');

    cy.intercept('PATCH', '**/data*').as('saveFormData');

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

    cy.findByRole('textbox', { name: /tekstfelt 3/i }).type('Litt mer informasjon');
    cy.waitUntilSaved();
    cy.get('@saveFormData.all').should('have.length', 1);

    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.waitUntilSaved();
    cy.get('@saveFormData.all').should('have.length', 2);

    cy.findByRole('textbox', { name: /e-post/i }).type('test@test.test');
    cy.waitUntilSaved();
    cy.get('@saveFormData.all').should('have.length', 3);

    cy.findByRole('textbox', { name: /mobilnummer/i }).type('98765432');
    cy.waitUntilSaved();
    cy.get('@saveFormData.all').should('have.length', 4);

    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();
    cy.waitUntilSaved();
    cy.get('@saveFormData.all').should('have.length', 4);

    cy.findByText(errorReportTitle).should('not.exist');

    // Test with autoSaveBehavior onChangePage in order to test that requestManualSave works as expected
    interceptAltinnAppGlobalData((globalData) => {
      globalData.layoutSets.uiSettings.autoSaveBehavior = 'onChangePage';
    });
    cy.reloadAndWait();

    cy.findByRole('textbox', { name: /tekstfelt 3/i }).clear();
    cy.findByRole('textbox', { name: /tekstfelt 3/i }).type('Noe annet denne gangen');
    cy.findByRole('button', { name: /legg til ny/i }).click();
    cy.findByRole('textbox', { name: /e-post/i }).type('test123@test.test');
    cy.findByRole('textbox', { name: /mobilnummer/i }).type('12345678');
    cy.findAllByRole('button', { name: /lagre og lukk/i })
      .first()
      .click();

    cy.intercept('PATCH', '**/data*').as('saveFormData2');
    cy.findByRole('button', { name: 'Neste' }).click();
    cy.waitUntilSaved();
    cy.get('@saveFormData2.all').should('have.length', 1);

    cy.findByRole('heading', { name: /Test av delt modell/ }).should('be.visible');

    // Casing is important here. The Address component will normally try to look up the post code and overwrite
    // it with 'KARDEMOMME BY' here, but since the component is marked as readOnly that should not happen.
    cy.findByRole('textbox', { name: /Poststed/ }).should('have.value', 'Kardemomme By');

    cy.findByText(errorReportTitle).should('not.exist');

    cy.findByRole('button', { name: 'Send inn' }).clickAndGone();

    cy.findByRole('heading', { name: /kvittering/i }).should('be.visible');
    cy.get(appFrontend.multipleDatamodelsTest.textField1Summary).should('contain.text', 'første');
    cy.get(appFrontend.multipleDatamodelsTest.textField2Paragraph).should('contain.text', 'andre');
    cy.get(appFrontend.multipleDatamodelsTest.textField3Summary).should('contain.text', 'Noe annet denne gangen');

    // This assertion helps to make sure the post place field is not updated above. Since we save on page changes,
    // any updates to that field would have resulted in another save request.
    cy.get('@saveFormData2.all').should('have.length', 1);

    cy.findByText(errorReportTitle).should('not.exist');
  });
});
