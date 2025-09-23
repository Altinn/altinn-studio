import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Datalist } from 'test/e2e/pageobjects/datalist';
import { Likert } from 'test/e2e/pageobjects/likert';
import type { FillableFrontendTasks } from 'test/e2e/support/global';

const appFrontend = new AppFrontend();
const dataListPage = new Datalist();

function fillOutChangeName() {
  cy.get(appFrontend.changeOfName.currentName).then(() => {
    // Fill out the grid first. There are other pages with elements that trigger validation, so filling out the grid
    // first will avoid a lingering validation error on the grid page. A real developer and app would probably not
    // make this mistake in designing their form.
    cy.navPage('grid').click();
    cy.get(appFrontend.grid.totalAmount).should('have.value', '0 kr');
    cy.get(appFrontend.grid.totalAmount).type('1000000');

    // These fields are filled out every meticulously, because the number formatting and complex state management
    // as a result of number formatting + data fetched from the server causes them to be very flaky. In later
    // versions of the design system the number formatting should be a feature we add to the TextField, not a feature
    // we get from it, so we might be able to reduce the flakiness when we upgrade. Test flakiness again by
    // deleting all the lines apart from the 'type' commands.
    // @see https://github.com/Altinn/app-frontend-react/issues/1520
    cy.get(appFrontend.grid.bolig.percent).should('have.value', '0 %');
    cy.get(appFrontend.grid.bolig.percent).type('80');
    cy.get(appFrontend.grid.bolig.percent).blur();
    cy.get(appFrontend.grid.bolig.percent).should('have.value', '80 %');

    cy.get(appFrontend.grid.studie.percent).should('have.value', '0 %');
    cy.get(appFrontend.grid.studie.percent).type('15');
    cy.get(appFrontend.grid.studie.percent).blur();
    cy.get(appFrontend.grid.studie.percent).should('have.value', '15 %');

    cy.get(appFrontend.grid.kredittkort.percent).should('have.value', '0 %');
    cy.get(appFrontend.grid.kredittkort.percent).type('5');
    cy.get(appFrontend.grid.kredittkort.percent).blur();
    cy.get(appFrontend.grid.kredittkort.percent).should('have.value', '5 %');

    cy.get(appFrontend.grid.kredittkort.amount).should('have.value', '50 000 kr');

    cy.navPage('form').click();
    cy.get(appFrontend.changeOfName.newFirstName).type('a');
    cy.findByRole('tab', { name: /nytt etternavn/i }).click();
    cy.get(appFrontend.changeOfName.newLastName).type('a');
    cy.get(appFrontend.changeOfName.confirmChangeName)
      .findByRole('checkbox', {
        name: /Ja[a-z, ]*/,
      })
      .check();
    cy.get(appFrontend.changeOfName.reasonRelationship).click();
    cy.get(appFrontend.changeOfName.reasonRelationship).type('test');
    cy.findByRole('button', { name: appFrontend.changeOfName.datePickerButton }).click();
    cy.get('button[aria-label*="Today"]').click();
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });

    cy.navPage('grid').click();
    cy.get(appFrontend.grid.kredittkort.percent).should('be.visible');
  });
}

function fillOutGroup() {
  const mkFile = (fileName: string) => {
    cy.log(`Making new file: ${fileName}`);
    return {
      fileName,
      mimeType: 'application/pdf',
      lastModified: Date.now(),
      contents: Cypress.Buffer.from('hello world'),
    };
  };

  cy.intercept('POST', '**/instances/**/data?dataType=*').as('upload');
  cy.findByRole('button', { name: /Neste/ }).click();
  cy.get(appFrontend.group.showGroupToContinue).findByRole('checkbox', { name: 'Ja' }).check();
  cy.addItemToGroup(1, 2, 'automation');
  cy.findAllByRole('button', { name: /Rediger/ })
    .eq(0)
    .click();
  cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
  cy.get(appFrontend.group.row(0).uploadSingle.dropZone).selectFile(mkFile('attachment-in-single.pdf'), {
    force: true,
  });
  cy.wait('@upload');
  cy.get(appFrontend.group.row(0).uploadSingle.attachments(0).name).should('have.text', 'attachment-in-single.pdf');
  cy.get(appFrontend.group.row(0).uploadMulti.dropZone).selectFile(mkFile('attachment-in-multi1.pdf'), { force: true });
  cy.wait('@upload');
  cy.get(appFrontend.group.row(0).uploadMulti.attachments(0).name).should('have.text', 'attachment-in-multi1.pdf');
  cy.get(appFrontend.group.row(0).uploadMulti.addMoreBtn).click();
  cy.get(appFrontend.group.row(0).uploadMulti.dropZone).selectFile(mkFile('attachment-in-multi2.pdf'), { force: true });
  cy.wait('@upload');
  cy.get(appFrontend.group.row(0).uploadMulti.attachments(1).name).should('have.text', 'attachment-in-multi2.pdf');
  cy.get(appFrontend.group.row(0).nestedGroup.row(0).editBtn).click();
  cy.get(appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.dropZone).selectFile(
    mkFile('attachment-in-nested.pdf'),
    { force: true },
  );
  cy.wait('@upload');
  cy.dsSelect(appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.attachments(0).tagSelector!, 'Altinn');
  cy.findByRole('button', { name: 'Lagre' }).click();
  cy.findByRole('combobox', { name: 'Velg' }).should('not.exist');

  cy.dsSelect('#nested-source-0-0', 'Annet');
  cy.dsSelect('#nested-reference-0-0', 'Test');
  cy.dsSelect('#source-0', 'Digitaliseringsdirektoratet');
  cy.dsSelect('#reference-0', 'Sophie Salt');

  cy.get(appFrontend.group.saveMainGroup).clickAndGone();

  cy.gotoNavPage('hide');
  cy.get(appFrontend.group.sendersName).type('automation');
  cy.findByRole('button', { name: /Neste/ }).click();
  cy.get(appFrontend.group.summaryText).should('be.visible');
}

function fillOutLikert() {
  const likertPage = new Likert();
  cy.findByRole('table', { name: likertPage.requiredTableTitle }).within(() => {
    likertPage.requiredQuestions.forEach((question, index) => {
      likertPage.selectRadioDesktop(`${question} *`, likertPage.options[index]);
    });
  });
}

function fillOutList() {
  cy.get(dataListPage.tableBody).contains('Caroline').closest('tr').click();
  cy.findAllByRole('button', { name: 'Neste' }).last().click();
}

const functionMap: { [key in FillableFrontendTasks]: () => void } = {
  changename: fillOutChangeName,
  group: fillOutGroup,
  likert: fillOutLikert,
  datalist: fillOutList,
};

Cypress.Commands.add('gotoAndComplete', (task) => {
  cy.goto(task);
  cy.log(`Filling out ${task}`);
  functionMap[task]();
});

Cypress.Commands.add('fillOut', (task) => {
  cy.log(`Filling out ${task}`);
  functionMap[task]();
});
