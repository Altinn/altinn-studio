import { AppFrontend } from 'test/e2e/pageobjects/app-frontend';
import { Common } from 'test/e2e/pageobjects/common';
import { Datalist } from 'test/e2e/pageobjects/datalist';
import { Likert } from 'test/e2e/pageobjects/likert';
import type { FillableFrontendTasks } from 'test/e2e/support/global';

const mui = new Common();
const appFrontend = new AppFrontend();
const dataListPage = new Datalist();

function fillOutChangeName() {
  cy.get(appFrontend.changeOfName.currentName).then(() => {
    // Fill out the grid first. There are other pages with elements that trigger validation, so filling out the grid
    // first will avoid a lingering validation error on the grid page. A real developer and app would probably not
    // make this mistake in designing their form.
    cy.navPage('grid').click();
    cy.get(appFrontend.grid.totalAmount).type('1000000');
    cy.get(appFrontend.grid.bolig.percent).type('80');
    cy.get(appFrontend.grid.studie.percent).type('15');
    cy.get(appFrontend.grid.kredittkort.percent).type('5');

    cy.navPage('form').click();
    cy.get(appFrontend.changeOfName.newFirstName).type('a');
    cy.get(appFrontend.changeOfName.newLastName).type('a');
    cy.get(appFrontend.changeOfName.confirmChangeName).find('input').dsCheck();
    cy.get(appFrontend.changeOfName.reasonRelationship).click();
    cy.get(appFrontend.changeOfName.reasonRelationship).type('test');
    cy.get(appFrontend.changeOfName.dateOfEffect).siblings().children(mui.buttonIcon).click();
    cy.get(mui.selectedDate).click();
    cy.get(appFrontend.changeOfName.upload).selectFile('test/e2e/fixtures/test.pdf', { force: true });

    cy.navPage('grid').click();
  });
}

function fillOutGroup() {
  const mkFile = (fileName) => ({
    fileName,
    mimeType: 'application/pdf',
    lastModified: Date.now(),
    contents: Cypress.Buffer.from('hello world'),
  });

  cy.get(appFrontend.nextButton).click();
  cy.get(appFrontend.group.showGroupToContinue).find('input').dsCheck();
  cy.addItemToGroup(1, 2, 'automation');
  cy.get(appFrontend.group.row(0).editBtn).click();
  cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
  cy.get(appFrontend.group.row(0).uploadSingle.dropZone).selectFile(mkFile('attachment-in-single.pdf'), {
    force: true,
  });
  cy.get(appFrontend.group.row(0).uploadMulti.dropZone).selectFile(mkFile('attachment-in-multi1.pdf'), {
    force: true,
  });
  cy.get(appFrontend.group.row(0).uploadMulti.addMoreBtn).click();
  cy.get(appFrontend.group.row(0).uploadMulti.dropZone).selectFile(mkFile('attachment-in-multi2.pdf'), {
    force: true,
  });
  cy.get(appFrontend.group.row(0).nestedGroup.row(0).editBtn).click();
  cy.get(appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.dropZone).selectFile(
    mkFile('attachment-in-nested.pdf'),
    { force: true },
  );
  cy.get(appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.attachments(0).tagSelector || 'nothing').select(
    'altinn',
  );
  cy.get(appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.attachments(0).tagSave || 'nothing').click();
  cy.get(appFrontend.group.row(0).nestedGroup.row(0).uploadTagMulti.attachments(0).tagSelector || 'nothing').should(
    'not.exist',
  );

  cy.get('#nested-source-0-0').dsSelect('Annet');
  cy.get('#nested-reference-0-0').dsSelect('Test');
  cy.get(appFrontend.group.editContainer).find(appFrontend.group.next).click();
  cy.get('#source-0').dsSelect('Digitaliseringsdirektoratet');
  cy.get('#reference-0').dsSelect('Sophie Salt');

  cy.get(appFrontend.group.saveMainGroup).clickAndGone();

  cy.get(appFrontend.nextButton).click();
  cy.get(appFrontend.group.sendersName).type('automation');
  cy.get(appFrontend.nextButton).click();
  cy.get(appFrontend.group.summaryText).should('be.visible');
}

function fillOutLikert() {
  const likertPage = new Likert();
  likertPage.selectRequiredRadios();
}

function fillOutList() {
  cy.get(dataListPage.tableBody).contains('Caroline').parent('td').parent('tr').click();
  cy.get(appFrontend.nextButton).click();
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
